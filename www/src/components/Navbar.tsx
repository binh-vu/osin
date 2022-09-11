import { Menu } from "antd";
import { makeStyles } from "@mui/styles";
import { useLocation } from "react-router-dom";
import { getActiveRouteName, NoArgsPathDef, PathDef } from "gena-app";
import React from "react";

const useStyles = makeStyles({
  root: {
    width: "75px !important",
    minHeight: "100vh",
    "& li": {
      padding: "0px !important",
      height: "80px !important",
      lineHeight: "normal !important",
      margin: "0px !important",
    },
    "& li.ant-menu-item-selected": {
      backgroundColor: "transparent !important",
    },
    "& li.ant-menu-item-selected span.ant-menu-title-content:before": {
      content: "''",
      position: "absolute",
      top: 20,
      left: 0,
      height: 40,
      width: 3,
      backgroundColor: "#fff",
      borderRadius: "0 .375rem .375rem 0",
    },
  },
  menuContent: {
    height: "80px !important",
    display: "flex !important",
    flexDirection: "column !important" as "column",
    justifyContent: "center !important",
    marginTop: "0px !important",
    marginBottom: "0px !important",
    alignItems: "center !important",
    "& svg": {
      fontSize: "24px !important",
    },
    "& span": {
      marginTop: 6,
      fontSize: "12px !important",
    },
  },
});

type MenuItemProps = {
  label: string | JSX.Element;
  title?: string;
  icon?: JSX.Element;
  danger?: boolean;
  disabled?: boolean;
};

interface Props<R> {
  menus: Partial<Record<keyof R, MenuItemProps>>;
  routes: R;
  route2schemaId: { [route: string]: number };
  className?: string;
  style?: React.CSSProperties;
  isFirstItemLogo?: boolean;
}

export const SideNavBar = <R extends Record<any, PathDef<any, any>>>({
  menus,
  routes,
  style,
  route2schemaId: sameSchemaRoutes,
}: Props<R>) => {
  const classes = useStyles();
  const location = useLocation();
  const activeRouteName = getActiveRouteName(location, routes);

  const openMenu = (e: { key: keyof R }) => {
    // only able to open this menu when the schema is the same
    let currentRoute = routes[activeRouteName!];

    routes[e.key]
      .path(
        currentRoute.getURLArgs(location)!,
        currentRoute.getQueryArgs(location)!
      )
      .open();
  };

  const isVisitable = (route: string) => {
    return (
      routes[route] instanceof NoArgsPathDef ||
      (activeRouteName !== undefined &&
        sameSchemaRoutes[activeRouteName] === sameSchemaRoutes[route])
    );
  };

  const items = Object.keys(menus).map((routeName, index) => {
    let item = menus[routeName]!;

    let label = null;
    if (item.label !== "") {
      label = <span>{item.label}</span>;
    }

    return {
      key: routeName,
      disabled: !isVisitable(routeName),
      label: (
        <div className={classes.menuContent}>
          {item.icon}
          {label}
        </div>
      ),
      title: item.title,
    };
  });

  return (
    <Menu
      mode="inline"
      className={classes.root}
      style={style}
      onClick={openMenu}
      theme="dark"
      inlineCollapsed={true}
      selectedKeys={
        activeRouteName !== undefined ? [activeRouteName] : undefined
      }
      items={items}
    />
  );
};
