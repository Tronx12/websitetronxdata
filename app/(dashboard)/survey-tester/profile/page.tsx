"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Edit2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  ChevronDown,
  Briefcase,
} from "lucide-react";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  workingShift: "day" | "night";
  phoneNumber?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    phoneNumber: "",
    workingShift: "day" as "day" | "night",
  });

  const [message, setMessage] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, []);

  // Auto-dismiss success/error banners after a few seconds
  const showMessage = (type: "success" | "error", text: string) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage({ type, text });
    messageTimeoutRef.current = setTimeout(() => {
      setMessage({ type: null, text: "" });
    }, 5000);
  };

  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/auth/me?_=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        showMessage("error", "You don't have permission to view this page.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.data);
        setFormData({
          name: data.data.name,
          email: data.data.email,
          employeeId: data.data.employeeId || "",
          phoneNumber: data.data.phoneNumber || "",
          workingShift: data.data.workingShift || "day",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showMessage("error", "Failed to load profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?._id) return;

    try {
      setIsSaving(true);
      setMessage({ type: null, text: "" });

      const response = await fetch(`/api/auth/users/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // data.data is already the fresh record — no need to re-fetch
        setUser(data.data);
        setFormData({
          name: data.data.name,
          email: data.data.email,
          employeeId: data.data.employeeId || "",
          phoneNumber: data.data.phoneNumber || "",
          workingShift: data.data.workingShift || "day",
        });

        setIsEditing(false);
        showMessage("success", "Profile updated successfully!");
      } else {
        throw new Error(data.message || "Update failed");
      }
    } catch (error: any) {
      showMessage("error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || "",
        phoneNumber: user.phoneNumber || "",
        workingShift: user.workingShift || "day",
      });
    }
    setIsEditing(false);
    setMessage({ type: null, text: "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Profile Not Found</h3>
        <p className="text-gray-500 mt-1">
          Unable to load your profile information.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const fieldsDisabled = !isEditing || isSaving;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h4 className="text-2xl font-bold text-gray-900">My Profile</h4>
        <p className="text-gray-500 mt-1">
          View and manage your personal information
        </p>
      </div>

      {/* Message Alert */}
      {message.type && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{user.name}</h2>
                <p className="text-blue-100 text-sm capitalize">
                  {user.role.replace("-", " ")}
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <fieldset disabled={isSaving} className="space-y-6">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={fieldsDisabled}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isEditing
                        ? "border-gray-300 bg-white"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div>
                <label
                  htmlFor="employeeId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Employee ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="employeeId"
                    name="employeeId"
                    type="text"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    // disabled={fieldsDisabled}
                    disabled
                    placeholder="EMP-001"
                    className={`block w-full pl-10 cursor-not-allowed  pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isEditing
                        ? "border-gray-300 bg-white"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed"
                    }`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    // value={formData.email}
                      value={user.email.replace("-", " ")}
                    onChange={handleInputChange}
                    disabled
                    // disabled={fieldsDisabled}
                    className={`block w-full pl-10  cursor-not-allowed pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isEditing
                        ? "border-gray-300 bg-white"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    disabled={fieldsDisabled}
                    placeholder="+1 (555) 000-0000"
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isEditing
                        ? "border-gray-300 bg-white"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed"
                    }`}
                  />
                </div>
              </div>

              {/* Working Shift */}
              <div>
                <label
                  htmlFor="workingShift"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Working Shift
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="workingShift"
                    name="workingShift"
                    value={formData.workingShift}
                    onChange={handleInputChange}
                    disabled={fieldsDisabled}
                    className={`block w-full pl-10 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none ${
                      isEditing
                        ? "border-gray-300 bg-white"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed"
                    }`}
                  >
                    <option value="day">Day Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Role (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={user.role.replace("-", " ").toUpperCase()}
                    disabled
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 bg-gray-50 rounded-lg cursor-not-allowed text-gray-600 font-medium"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Role cannot be changed here. Contact an administrator.
                </p>
              </div>

              {/* Account Info */}
              <div className="pt-4 border-t border-gray-200">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Member Since</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Last Updated</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(user.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}