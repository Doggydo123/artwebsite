import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login gate when not authenticated", () => {
  localStorage.clear();
  render(<App />);
  expect(screen.getByText(/authenticate/i)).toBeInTheDocument();
});
