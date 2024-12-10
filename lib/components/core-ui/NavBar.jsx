import { twMerge } from "tailwind-merge";

// export function NavBar({ roottwMerge = "", children }) {
//   return <div className={twMerge("w-full", rootClassNames)}>{children}</div>;
// }

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Logo } from "./Logo";

// const items = [
//   { name: 'Dashboard', href: '#', current: true },
//   { name: 'Team', href: '#', current: false },
//   { name: 'Projects', href: '#', current: false },
//   { name: 'Calendar', href: '#', current: false },
// ]
/**
 * @typedef {Object} NavBarProps
 * @property {Array<{title: string, href: string, current: boolean, onClick: function}>} [items] - The items to be displayed in the navbar.
 * @property {string} [rootClassNames] - Additional classes to be added to the root div.
 */

/**
 * Simple Navbar component
 * @param {NavBarProps} props
 */
export function NavBar({ items = [], rootClassNames = "" }) {
  return (
    <Disclosure as="nav" className={twMerge("bg-white dark:bg-gray-800 shadow", rootClassNames)}>
      <div className="mx-auto max-w-7xl px-4 xl:px-6 lg:px-8">
        <div className="flex h-12 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Logo classNames="h-6 dark:invert" />
            </div>
            <div className="hidden xl:ml-6 xl:flex xl:space-x-8">
              {/* Current: "border-blue-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}
              {items.map(
                (item) =>
                  item.render || (
                    <a
                      key={item.title}
                      href={item.href}
                      onClick={(e) => {
                        item?.onClick ? item.onClick(e) : null;
                      }}
                      className={twMerge(
                        "inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-200",
                        item.current ? "border-blue-500 text-gray-900 dark:text-white" : ""
                      )}
                      aria-current={item.current ? "page" : undefined}
                    >
                      {item.title}
                    </a>
                  )
              )}
            </div>
          </div>
          <div className="hidden xl:ml-6 xl:flex xl:items-center">
            <button
              type="button"
              className="relative rounded-full bg-white dark:bg-gray-700 p-1 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View notifications</span>
            </button>
          </div>
          <div className="-mr-2 flex items-center xl:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon
                aria-hidden="true"
                className="block h-6 w-6 group-data-[open]:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden h-6 w-6 group-data-[open]:block"
              />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className="xl:hidden max-w-7xl px-4 xl:px-6">
        <div className="space-y-1 pb-3 pt-2">
          {items.map(
            (item) =>
              item.render || (
                <DisclosureButton
                  key={item.title}
                  as="a"
                  href={item.href}
                  onClick={(e) => {
                    item?.onClick ? item.onClick(e) : null;
                  }}
                  className={twMerge(
                    "block border-l-4 border-transparent py-2 pl-3 pr-4 text-base text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200",
                    item.current
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : ""
                  )}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.title}
                </DisclosureButton>
              )
          )}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
