const setupBaseUrl = (protocol, path, apiEndpoint) => {
  if (protocol !== "http" && protocol !== "ws") {
    throw new Error("Protocol not supported");
  }

  if (path !== "") {
    if (protocol === "ws") {
      return `${apiEndpoint.replace(
        "http",
        "ws"
      )}/${path}`;
    } else {
      return `${apiEndpoint}/${path}`;
    }
  }

  return `${apiEndpoint}`;
};

export default setupBaseUrl;
