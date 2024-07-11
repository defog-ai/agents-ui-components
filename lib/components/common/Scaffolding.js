import React, { useState, useEffect, useContext } from "react";
import { Context } from "$context/Context";
import { Layout } from "antd/lib";
import { useRouter } from "next/router";
import Link from "next/link";
import { NavBar } from "$ui-components";

const Scaffolding = ({ id, userType, children }) => {
  const { Content, Sider } = Layout;
  const [items, setItems] = useState([]);
  const [context, setContext] = useContext(Context);

  const router = useRouter();

  const redirect = (path) => {
    router.push(path);
  };

  const logout = () => {
    localStorage.removeItem("defogUser");
    localStorage.removeItem("defogToken");
    localStorage.removeItem("defogUserType");
    setContext({
      user: null,
      token: null,
      userType: null,
    });

    redirect("/log-in");
  };

  useEffect(() => {
    let items = [];
    if (userType == "admin") {
      items = [
        {
          key: "manage-database",
          title: "Manage Database",
          icon: (
            <a onClick={() => redirect("/extract-metadata")}>💾 Manage DB</a>
          ),
        },
        {
          key: "manage-users",
          title: "Manage Users",
          icon: (
            <a onClick={() => redirect("/manage-users")}>🔐 Manage Users</a>
          ),
        },
        {
          key: "view-notebooks",
          title: "View your notebook",
          icon: (
            <a onClick={() => redirect("/view-notebooks")}>📒 Your Notebooks</a>
          ),
        },
        {
          key: "manage-tools",
          title: "Manage tools",
          icon: <a onClick={() => redirect("/manage-tools")}>Manage tools</a>,
        },
        {
          key: "check-readiness",
          title: "Check Readiness",
          icon: <Link href="/check-readiness">✅ Check Readiness</Link>,
        },
        {
          key: "align-model",
          title: "Align Model",
          icon: <Link href="/align-model">⚙️ Align Model</Link>,
        },
        {
          key: "query-data",
          title: "Query Data",
          icon: <Link href="/query-data">🔍 Query Data</Link>,
        },
        {
          key: "logout",
          title: "Logout",
          icon: <a onClick={logout}>↪ Logout</a>,
        },
      ];
    } else if (!userType) {
      items = [];
    } else {
      items = [
        {
          key: "view-notebooks",
          title: "View your notebook",
          icon: (
            <a onClick={() => redirect("/view-notebooks")}>Your Notebooks</a>
          ),
        },
        {
          key: "query-data",
          title: "Query Data",
          icon: <Link href="/query-data">🔍 Query Data</Link>,
        },
        {
          key: "logout",
          title: "Logout",
          icon: <a onClick={() => redirect("/manage-tools")}>Logout</a>,
        },
      ];
    }
    setItems(items);
  }, [userType]);

  const logoutItem = items.find((item) => item.key === "logout");
  const navItemClasses =
    "text-sm text-gray-500 py-2 m-2 rounded-md flex items-center cursor-pointer hover:bg-gray-300 hover:text-gray-600 px-2";

  return (
    <div className="flex flex-col md:min-h-screen relative">
      {items.length ? (
        <NavBar rootClassNames="bg-gray-100">
          <div className="flex flex-row px-4 border-b">
            <div className="grow self-start flex flex-row">
              {items
                .filter((d) => d.key !== "logout")
                .map((item) => {
                  return (
                    <div key={item.key} className={navItemClasses}>
                      {item.icon}
                    </div>
                  );
                })}
            </div>
            {logoutItem && (
              <div className="self-end">
                <div key="logout" className={navItemClasses}>
                  {logoutItem.icon}
                </div>
              </div>
            )}
          </div>
        </NavBar>
      ) : (
        <></>
      )}
      <div className="grow">{children}</div>
    </div>
  );
};

export default Scaffolding;
