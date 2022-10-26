import { green, red } from "@ant-design/colors";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { Tag, Typography } from "antd";
import humanizeDuration from "humanize-duration";

const dtFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  second: "numeric",
});
export const dtFormatToParts = (dt: Date, formatter?: Intl.DateTimeFormat) => {
  const [
    month,
    _lit1,
    day,
    _lit2,
    year,
    _lit3,
    hour,
    _lit4,
    minute,
    _lit5,
    second,
  ] = (formatter || dtFormatter).formatToParts(dt);

  return {
    month: month.value,
    day: day.value,
    year: year.value,
    hour: hour.value,
    minute: minute.value,
    second: second.value,
  };
};

export const EmptyToken = "";

export const Render = {
  str: (text: any) => {
    if (text === null || text === undefined) {
      return EmptyToken;
    }
    return text.toString();
  },
  strMonospace: (text: any) => {
    if (text === null || text === undefined) {
      return EmptyToken;
    }
    return <Typography.Text code={true}>{text.toString()}</Typography.Text>;
  },
  boolFmt1: (value: boolean) =>
    value ? (
      <CheckCircleFilled style={{ color: green[6] }} />
    ) : (
      <CloseCircleFilled style={{ color: red[6] }} />
    ),
  boolFmt2: (value: boolean) =>
    value ? <Tag color="success">true</Tag> : <Tag color="error">false</Tag>,
  boolFmt3Reverse: (value: boolean) =>
    value ? <Tag color="error">yes</Tag> : <Tag color="success">no</Tag>,
  number: (value: number | null | undefined) => {
    if (value === undefined || value === null) {
      return EmptyToken;
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 3 });
  },
  datetimeFmt1: (dt: Date) => {
    // time first
    const p = dtFormatToParts(dt);
    return `${p.hour}:${p.minute}:${p.second} · ${p.day} ${p.month}, ${p.year}`;
  },
  datetimeFmt2: (dt: Date) => {
    const p = dtFormatToParts(dt);
    return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}:${p.second}`;
  },
  duration: (ms: number | undefined | null) => {
    if (ms === undefined || ms === null) {
      return EmptyToken;
    }
    return humanizeDuration(ms);
  },
  auto: (value: any) => {
    if (typeof value === "number") {
      return Render.number(value);
    }
    if (typeof value === "boolean") {
      return Render.boolFmt2(value);
    }
    return Render.str(value);
  },
};
