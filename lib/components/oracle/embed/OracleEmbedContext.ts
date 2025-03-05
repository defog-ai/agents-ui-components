import { createContext } from "react";
import { OracleSearchBarManager } from "./search-bar/oracleSearchBarManager";

interface OracleEmbedContext {
  apiEndpoint: string;
  token: string;
  searchBarManager: OracleSearchBarManager;
}

export const OracleEmbedContext = createContext<OracleEmbedContext>({
  apiEndpoint: "",
  token: "",
  searchBarManager: OracleSearchBarManager(),
});
