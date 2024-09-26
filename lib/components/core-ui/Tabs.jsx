import React, { useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { breakpoints } from "../hooks/useBreakPoint";
import { useWindowSize } from "../hooks/useWindowSize";
import { SingleSelect } from "./SingleSelect";

/**
 * @typedef {{name: string, content?: [React.ReactNode], classNames?: string, headerClassNames?: string}} Tab
 * @property {string} name - The name of the tab.
 * @property {React.ReactNode} content - The content of the tab.
 * @property {string} [classNames] - Additional classes to be added to the tab content.
 * @property {function} [headerClassNames] - Additional classes to be added to the tab header.
 *
 * @typedef {Object} TabsProps
 * @property {Array<Tab>} [tabs] - The tabs to be displayed.
 * @property {string} [defaultSelected] - The default selected tab.
 * @property {string} [selected] - The selected tab.
 * @property {"small" | "normal"} [size] - The tab size
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 * @property {string} [defaultTabClassNames] - Additional classes to be added to all tabs.
 * @property {string} [contentClassNames] - Additional classes to be added to the tab content.
 * @property {function|string} [selectedTabHeaderClasses] - Additional classes to be added to the selected tab's header. Can be a string or a function that takes the selected tab name as an argument.
 * @property {boolean} [vertical] - If true, the tabs will be displayed vertically. If disableSingleSelect is false, changes to a horizontal single select on the phone. Otherwise, goes to horizontal tabs.
 * @property {boolean} [disableSingleSelect] - If disableSingleSelect is true, we will always show tabs, and never resort to a dropdown. If vertical is true and disableSingleSelect is false, we will show normal tabs on top on <=sm and vertical tabs above sm
 */

/**
 * Tabs component
 * @param {TabsProps} props - The props for the component
 * @example
 * const tabs = [
 *   { name: 'Normal tab', content: <div>Content 3</div>},
 *   { name: 'Red background in tab content', content: <div>Content 1</div>, classNames: "bg-red-500" },
 *   { name: 'Blue header tab', content: <div>Content 2</div>, headerClassNames: "bg-blue-500" },
 * ];
 *
 * <Tabs tabs={tabs} defaultSelected="Normal tab" />
 * */
export function Tabs({
  tabs = [],
  defaultSelected = null,
  selected = null,
  size = "normal",
  rootClassNames = "",
  defaultTabClassNames = "",
  contentClassNames = "",
  selectedTabHeaderClasses = (...args) => "bg-primary-highlight",
  vertical = false,
  disableSingleSelect = false,
}) {
  const windowSize = useWindowSize();

  const showVerticalTabs = useMemo(() => {
    return vertical && !(disableSingleSelect && windowSize[0] < breakpoints.sm);
  }, [windowSize[0] < breakpoints.sm, vertical, disableSingleSelect]);

  const [selectedTab, setSelectedTab] = useState(
    (defaultSelected && tabs.find((tab) => tab.name === defaultSelected)) ||
      selected ||
      tabs[0]
  );

  useEffect(() => {
    if (selected !== selectedTab.name) {
      const t = tabs.find((tab) => tab.name === selected);
      if (t) {
        setSelectedTab(t);
      }
    }
  }, [selected]);

  return (
    <div
      className={twMerge(
        "relative",
        showVerticalTabs
          ? "flex flex-col sm:flex sm:flex-row"
          : "flex flex-col",
        rootClassNames
      )}
    >
      <div
        role="tablist"
        className={twMerge(
          "tab-group",
          showVerticalTabs
            ? "sm:relative sm:left-0 origin-right z-10"
            : "flex flex-row"
        )}
      >
        {!disableSingleSelect && (
          <div className={"sm:hidden grow"}>
            {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
            <SingleSelect
              options={tabs.map((tab) => ({
                key: tab.name,
                label: tab.name,
                value: tab.name,
              }))}
              placeholder="Select a tab"
              rootClassNames="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={selectedTab.name}
              allowCreateNewOption={false}
              onChange={(val) => {
                const t = tabs.find((tab) => tab.name === val);
                if (t) {
                  setSelectedTab(t);
                }
              }}
            />
          </div>
        )}
        <div
          className={twMerge(
            "max-w-full",
            size === "small" ? "" : "grow",
            disableSingleSelect ? "block" : "hidden sm:block"
          )}
        >
          <nav
            className={twMerge(
              "isolate flex divide-gray-200 shadow max-w-full overflow-scroll",
              size === "small" ? "rounded-t-2xl" : "rounded-2xl",
              showVerticalTabs
                ? "divide-y flex flex-col rounded-r-none rounded-l-2xl"
                : "divide-x"
            )}
            aria-label="Tabs"
          >
            {tabs.map((tab, tabIdx) => (
              <div
                aria-roledescription="tab"
                role="tab"
                key={tab.name + "-" + tabIdx}
                className={twMerge(
                  "flex items-center justify-center cursor-pointer",
                  selectedTab.name === tab.name
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-1000",
                  tabIdx === 0
                    ? showVerticalTabs
                      ? "rounded-tl-2xl"
                      : "rounded-l-2xl"
                    : "",
                  tabIdx === tabs.length - 1
                    ? showVerticalTabs
                      ? "rounded-bl-2xl"
                      : "rounded-r-2xl"
                    : "",
                  "group relative min-w-fit overflow-hidden flex-1 bg-white text-center text-sm font-medium hover:bg-gray-50 focus:z-10",
                  showVerticalTabs
                    ? "px-2 py-4 min-h-28 max-h-32"
                    : "py-4 px-4",
                  size === "small"
                    ? showVerticalTabs
                      ? "py-2"
                      : "whitespace-nowrap rounded-b-none py-2"
                    : "",
                  typeof tab?.headerClassNames === "function"
                    ? tab?.headerClassNames?.(
                        selectedTab.name === tab.name,
                        tab
                      )
                    : tab?.headerClassNames
                )}
                onClick={() => {
                  setSelectedTab(tab);
                }}
                aria-current={
                  selectedTab.name === tab.name ? "page" : undefined
                }
              >
                <div
                  style={{
                    writingMode: showVerticalTabs ? "tb-rl" : "",
                    transform: showVerticalTabs ? "rotate(-180deg)" : "",
                  }}
                >
                  {tab.name}
                </div>
                <span
                  aria-hidden="true"
                  className={twMerge(
                    selectedTab.name === tab.name
                      ? twMerge(
                          "bg-primary-highlight",
                          typeof selectedTabHeaderClasses === "function"
                            ? selectedTabHeaderClasses?.(selectedTab.name)
                            : selectedTabHeaderClasses
                        )
                      : "bg-black/10",
                    "absolute",
                    showVerticalTabs
                      ? "top-0 right-0 w-0.5 h-full"
                      : "inset-x-0 bottom-0 h-0.5"
                  )}
                />
              </div>
            ))}
          </nav>
        </div>
      </div>
      <div
        className={twMerge(
          "tab-content relative",
          showVerticalTabs ? "pl-0" : "",
          contentClassNames
        )}
      >
        {tabs.map((tab) => (
          <div
            key={tab.name}
            className={twMerge(
              defaultTabClassNames,
              selectedTab?.classNames,
              selectedTab.name === tab.name
                ? "relative z-10"
                : "fixed left-[-1000px] top-[-1000px] z-[-1] pointer-events-none *:pointer-events-none opacity-0"
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
