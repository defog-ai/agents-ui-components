import { Modal } from "antd";
import { useState } from "react";

export default function GoodModal({ open, setModalVisible, analysisSteps }) {
  const [dag, setDag] = useState(null);
  const [dagLinks, setDagLinks] = useState([]);

  return (
    <Modal
      title="To improve the model, could you please give more details about why this is a good plan? :)"
      open={open}
      footer={null}
      onCancel={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setModalVisible(null);
      }}
      centered
    >
      Good Modal
    </Modal>
  );
}
