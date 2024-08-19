import React, { useState } from 'react';
import { message, Modal } from 'antd';

const SQLFeedback = ({
  question,
  sql,
  previous_context,
  apiEndpoint,
  token,
  keyName,
  analysisId,
}) => {

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const uploadFeedback = async(
    feedbackType,
    feedbackText
  ) => {
    setLoading(true);
    const url = apiEndpoint + "/feedback";
    const data = {
      previous_context: previous_context,
      feedback: feedbackType,
      text: feedbackText,
      key_name: keyName,
      token: token,
      response: {
        question: question,
        generatedSql: sql,
        questionId: analysisId,
      }
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.status === "received") {
      message.success("Feedback submitted successfully");
    } else {
      message.error("Failed to submit feedback");
    }
    setLoading(true);
  }

  const NegativeFeedbackModal = () => {
    return (
      <Modal
        title="Align the model by providing feedback"
        open={modalVisible}
        onOk={async () => {
          await uploadFeedback("bad", document.getElementById(`${question}-feedback-text`).value);
          setModalVisible(false);
        }}
        onCancel={() => {
          setModalVisible(false);
        }}
        okText="Submit"
        loading={loading}
      >
        <textarea
          className="w-full h-32"
          placeholder="Add your feedback here"
          id={`${question}-feedback-text`}
        />
      </Modal>
    )
  }


  return (
    <div className="h-10 mt-2">
      {/* thumbs up or thumbs down feedback */}
      <div className="flex items-left h-10 gap-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer"
          onClick={() => {
            uploadFeedback("good", "");
          }}
        >
          <span className="text-md">👍</span>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer"
          onClick={() => {
            // show a modal to get feedback text
            setModalVisible(true);
          }}
        >
          <span className="text-md">👎</span>
        </div>
      </div>
      <NegativeFeedbackModal />
    </div>
  )
}

export default SQLFeedback