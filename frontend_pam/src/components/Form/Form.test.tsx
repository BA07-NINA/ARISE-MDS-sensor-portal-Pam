import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Form from "@/components/Form";
import AuthContext from "@/auth/AuthContext";

// Spy on window.alert
const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

// Mock postData function
vi.mock("@/utils/FetchFunctions", () => ({
  postData: vi.fn().mockResolvedValue({ device_ID: "mockDevice", deployment_ID: "mockDeployment" }),
}));

describe("Form component", () => {
  const mockOnSave = vi.fn();

  const renderForm = () => {
    const mockAuthContextValue = {
      authTokens: { access: "mockToken" },
    };

    return render(
      <AuthContext.Provider value={mockAuthContextValue as any}>
        <Form onSave={mockOnSave} />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders device and deployment fields", () => {
    renderForm();
    expect(screen.getByLabelText(/Device ID/i)).to.exist;
    expect(screen.getByLabelText(/Deployment ID/i)).to.exist;
  });

  it("submits the form successfully with valid data", async () => {
    renderForm();

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Device ID/i), {
      target: { value: "device123" },
    });
    fireEvent.change(screen.getByLabelText(/Deployment ID/i), {
      target: { value: "deployment123" },
    });
    fireEvent.change(screen.getByLabelText(/Site/i), {
      target: { value: "Test Site" },
    });

    // Click the submit button (ensure your Form has a button with accessible name "submit")
    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    // Wait for the alert to be called with the success message
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Your information was submitted successfully!"
      );
    });

    // Expect onSave to have been called once after a successful submission
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});