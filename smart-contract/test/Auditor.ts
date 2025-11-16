import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

function Auditor() {
  return React.createElement("h1", null, "Auditor — Platform Stats");
}

test("renders Auditor title", () => {
  const { getByText } = render(React.createElement(Auditor));
  expect(getByText(/Auditor — Platform Stats/i)).toBeInTheDocument();
});


