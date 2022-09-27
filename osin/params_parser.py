from abc import ABC, abstractmethod
import argparse
from dataclasses import MISSING, Field, fields, is_dataclass, dataclass
import sys
from typing import (
    Any,
    Dict,
    List,
    Literal,
    Mapping,
    NewType,
    Optional,
    Sequence,
    Type,
    Union,
    get_args,
    get_origin,
    get_type_hints,
    Generic,
    TypeVar,
)
from enum import Enum

ParamType = TypeVar("ParamType")


class ParamsParser(Generic[ParamType]):
    """Parsing parameters defined by one or multiple dataclass

    Args:
        params: one or more classes holding parameters. Properties of each class will be converted to arguments.
            When params is a sequence of classes, the properties of all classes will be in the same namespace.
            When params is a mapping of key and classes, the key will act as the namespace and the arguments will
            be prefixed with the key and the dot character.

        underscore_to_dash: whether to convert underscore to dash in the argument name.
    """

    def __init__(
        self,
        param_types: Type[ParamType],
        underscore_to_dash: bool = True,
    ):
        self.parser = argparse.ArgumentParser()
        self.underscore_to_dash = underscore_to_dash
        self.param_types = param_types

        if is_dataclass(param_types):
            self.deser = self._add_dataclass_arguments(param_types)
        elif isinstance(param_types, (list, tuple)):
            self.deser = []
            for dtype in param_types:  # type: ignore
                self.deser.append(self._add_dataclass_arguments(dtype))
        elif isinstance(param_types, Mapping):
            self.deser = {}
            for namespace, dtype in param_types.items():
                self.deser[namespace] = self._add_dataclass_arguments(dtype, namespace)

    def parse_args(
        self, args: Optional[Sequence[str]] = None, known_only: bool = False
    ) -> ParamType:
        if known_only:
            ns = self.parser.parse_known_args(args)
        else:
            ns = self.parser.parse_args(args)

        if isinstance(self.deser, dict):
            return {k: v.deserialize(ns) for k, v in self.deser.items()}  # type: ignore
        elif isinstance(self.deser, list):
            return [v.deserialize(ns) for v in self.deser]  # type: ignore
        else:
            return self.deser.deserialize(ns)

    def _add_dataclass_arguments(self, dtype: Any, namespace: str = ""):
        type_hints: Dict[str, type] = get_type_hints(dtype)

        deser = DeserMultiFields(dtype, [])

        for field in fields(dtype):
            assert (
                field.init
            ), "Only fields with init=True are supported (included in the generated __init__ method)"
            argname = field.name if namespace == "" else f"{namespace}.{field.name}"
            if self.underscore_to_dash:
                argname = argname.replace("_", "-")

            field_doc = ""
            field_type = type_hints[field.name]

            deser.field_names.append(
                self._add_argument_from_type(argname, field, field_type, field_doc)
            )

        return deser

    def _add_argument_from_type(
        self, argname: str, field: Field, field_type: Any, annotated_desc: str
    ):
        if field.default is not MISSING:
            default = field.default
            require = False
        else:
            default = None
            require = True

        if field_type is str:
            self.parser.add_argument(
                f"--{argname}", default=default, required=require, help=annotated_desc
            )
            return DeserSingleField(argname)
        if field_type is int:
            self.parser.add_argument(
                f"--{argname}",
                type=int,
                default=default,
                required=require,
                help=annotated_desc,
            )
            return DeserSingleField(argname)
        if field_type is float:
            self.parser.add_argument(
                f"--{argname}",
                type=float,
                default=default,
                required=require,
                help=annotated_desc,
            )
            return DeserSingleField(argname)
        if field_type is bool:
            self.parser.add_argument(
                f"--{argname}",
                type=string_to_bool,
                default=default,
                required=require,
                help=annotated_desc,
            )
            return DeserSingleField(argname)
        if is_dataclass(field_type):
            return self._add_dataclass_arguments(field_type, namespace=argname)

        # handling generic types
        origin = get_origin(field_type)
        if origin is None:
            # not generic types, we assume it can be reconstructed from string
            # some classes support this is enum.Enum, pathlib.Path
            self.parser.add_argument(
                f"--{argname}",
                type=field_type,
                default=default,
                required=require,
                help=annotated_desc,
            )
            return DeserSingleField(argname)

        args = get_args(field_type)
        if origin is Literal:
            # how about a mix of int and str?
            self.parser.add_argument(
                f"--{argname}",
                choices=args,
                default=default,
                required=require,
                help=annotated_desc,
            )
            return DeserSingleField(argname)

        if origin is Union:
            raise NotImplementedError()

        if origin is list:
            raise NotImplementedError()

        if origin is set:
            raise NotImplementedError()

        if origin is dict:
            raise NotImplementedError()

        raise NoDerivedArgParser().add_trace(argname, field_type)


# From https://stackoverflow.com/questions/15008758/parsing-boolean-values-with-argparse
def string_to_bool(v: str):
    if isinstance(v, bool):
        return v
    if v.lower() in ("yes", "true", "t", "y", "1"):
        return True
    elif v.lower() in ("no", "false", "f", "n", "0"):
        return False
    else:
        raise argparse.ArgumentTypeError(
            f"Truthy value expected: got {v} but expected one of yes/no, true/false, t/f, y/n, 1/0 (case insensitive)."
        )


class NoDerivedArgParser(Exception):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.error_trace = []

    def get_root_field(self):
        return self.error_trace[-1]

    def add_trace(self, *parents: str):
        self.error_trace.extend(reversed(parents))
        return self

    def __str__(self) -> str:
        return f"cannot derive argument parser for: {list(reversed(self.error_trace))}"


class NSDeser(ABC):
    @abstractmethod
    def deserialize(self, ns: argparse.Namespace):
        pass


@dataclass
class DeserSingleField(NSDeser):
    field_name: str

    def deserialize(self, ns: argparse.Namespace):
        return getattr(ns, self.field_name.replace("-", "_"))


@dataclass
class DeserMultiFields(NSDeser):
    cls: Type
    field_names: List[NSDeser]

    def deserialize(self, ns: argparse.Namespace):
        return self.cls(*[f.deserialize(ns) for f in self.field_names])
