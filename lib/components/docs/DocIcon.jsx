import React from "react";
import {
  ArchiveBoxArrowDownIcon,
  ArchiveBoxXMarkIcon,
} from "@heroicons/react/20/solid";

export function DocIcon({
  doc,
  addDocIcon = false,
  recentlyViewed = false,
  onClick = null,
}) {
  return (
    <div className="doc-icon-ctr">
      <a
        target="_blank"
        href={`/doc?docId=${addDocIcon ? "new" : doc && doc.doc_id}`}
      >
        <div className={"doc-icon " + (addDocIcon ? "add-doc" : "")}>
          {addDocIcon ? (
            // a full width plus sign so it aligns center vertically
            // https://stackoverflow.com/questions/49491565/uibutton-label-text-vertical-alignment-for-plus-and-minus
            <p className="add-doc-plus">＋</p>
          ) : (
            <></>
          )}
        </div>

        <p className="doc-title">
          {addDocIcon ? "New doc" : doc.doc_title ? doc.doc_title : "Untitled"}
        </p>
        <p className="doc-date">
          {recentlyViewed ? "Last accessed: " : ""}
          {addDocIcon
            ? ""
            : // short string like 28 Aug, 2023
              doc?.timestamp?.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
        </p>
        {recentlyViewed ? (
          <p className="doc-date">Created by: {doc?.created_by}</p>
        ) : (
          <></>
        )}
      </a>
      {!addDocIcon && !recentlyViewed ? (
        <div
          className="doc-archive-icon"
          onClick={(e) => {
            if (
              !onClick ||
              // not a function
              typeof onClick !== "function" ||
              // add doc icon
              addDocIcon ||
              // recently viewed
              recentlyViewed
            )
              return;

            e.preventDefault();
            onClick(doc);
          }}
        >
          {doc.archived ? (
            <ArchiveBoxXMarkIcon className="w-3 h-3" />
          ) : (
            <ArchiveBoxArrowDownIcon className="w-3 h-3" />
          )}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
