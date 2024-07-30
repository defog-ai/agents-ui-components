import { AutoComplete, Button, Input, Select } from "antd";
import React, { useContext, useEffect, useRef, useState } from "react";
import { AgentConfigContext } from "../context/AgentContext";

export function DBCredsSidebar() {
  const agentConfigContext = useContext(AgentConfigContext);
  const [disabled, setDisabled] = useState(true);
  const ctr = useRef(null);

  // autocomplete fires onSelect event with new value before setting the input value
  // so we can't just use input value because it's not updated yet
  function checkChanged(newDbType = null) {
    const inputs = ctr.current.querySelectorAll(".ant-input");

    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].name === "dbType" && typeof newDbType === "string") {
        if (agentConfigContext.val.dbCreds[inputs[i].name] !== newDbType) {
          setDisabled(false);
          return;
        }
        continue;
      }

      if (agentConfigContext.val.dbCreds[inputs[i].name] !== inputs[i].value) {
        setDisabled(false);
        return;
      }
    }

    setDisabled(true);
  }

  function updateDbCreds() {
    if (!ctr.current) return;
    const inputs = Array.from(ctr.current.querySelectorAll(".ant-input"));

    const newCreds = { hasCreds: true };
    inputs.forEach((input) => {
      newCreds[input.name] = input.value;
      checkChanged({ target: input });
    });

    agentConfigContext.update({
      ...agentConfigContext.val,
      dbCreds: newCreds,
    });

    setDisabled(true);
  }

  return (
    <div className="sidebar" id="db-creds-sidebar">
      <div className="sidebar-content" ref={ctr}>
        <p className="small">Enter your DB credentials below and hit save.</p>

        <Input
          addonBefore="Database name"
          defaultValue={agentConfigContext.val.dbCreds.database}
          placeholder="Enter database name"
          onChange={checkChanged}
          name="database"
        ></Input>
        <Input
          addonBefore="Host"
          defaultValue={agentConfigContext.val.dbCreds.host}
          placeholder="Enter host"
          onChange={checkChanged}
          name="host"
        ></Input>

        <AutoComplete
          style={{ width: "100%" }}
          options={[
            { label: "Postgres", value: "postgres" },
            { label: "Redshift", value: "redshift" },
          ]}
          onSelect={checkChanged}
        >
          <Input
            addonBefore="DB type"
            defaultValue={agentConfigContext.val.dbCreds.host}
            placeholder="Enter database type"
            name="dbType"
            onChange={checkChanged}
          ></Input>
        </AutoComplete>

        <Input
          addonBefore="Port"
          defaultValue={agentConfigContext.val.dbCreds.port}
          placeholder="Enter port"
          onChange={checkChanged}
          name="port"
        ></Input>

        <Input
          addonBefore="User"
          defaultValue={agentConfigContext.val.dbCreds.user}
          placeholder="Enter user"
          onChange={checkChanged}
          name="user"
        ></Input>
        <Input
          addonBefore="Password"
          defaultValue={agentConfigContext.val.dbCreds.password}
          placeholder="Enter password"
          onChange={checkChanged}
          name="password"
        ></Input>
        <Button
          size="small"
          type="primary"
          disabled={disabled}
          onClick={updateDbCreds}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
