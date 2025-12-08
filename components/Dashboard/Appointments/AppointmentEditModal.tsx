"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import DatePicker from "react-datepicker";
import { fetchWithRefresh } from "@/libs/api/fetchWithRefresh";
import { API_ENDPOINTS } from "@/libs/api/config";
import {
  AppointmentStatus,
  appointmentStatusOptions,
  normalizeAppointmentStatus,
} from "@/libs/constants/appointments";
import "react-datepicker/dist/react-datepicker.css";

interface AppointmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number | null;
  salonId: number;
  onUpdated?: () => void;
}

interface AppointmentDetails {
  appointment_id: number;
  scheduled_time: string;
  status: AppointmentStatus;
  user_id: number | null;
  price: number;
  notes: string;
  staff_id: number | null;
  service_ids: number[];
}

interface Staff {
  staff_id: number;
  full_name: string;
}

interface Service {
  service_id: number;
  custom_name: string;
  duration: number;
  price: number;
}

interface ServiceResponse {
  service_id: number;
}

const AppointmentEditModal = ({
  isOpen,
  onClose,
  appointmentId,
  salonId,
  onUpdated,
}: AppointmentEditModalProps) => {
  const [form, setForm] = useState<AppointmentDetails | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [beforeImages, setBeforeImages] = useState<any[]>([]);
  const [afterImages, setAfterImages] = useState<any[]>([]);

  const [newBeforeUrl, setNewBeforeUrl] = useState("");
  const [newAfterUrl, setNewAfterUrl] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm(null);
      setStaffList([]);
      setServices([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !appointmentId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [apptRes, staffRes, serviceRes] = await Promise.all([
          fetchWithRefresh(
            API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId),
            { credentials: "include" }
          ),
          fetchWithRefresh(API_ENDPOINTS.STAFF.GET_SALON_STAFF(salonId), {
            credentials: "include",
          }),
          fetchWithRefresh(API_ENDPOINTS.SALONS.SERVICES(salonId), {
            credentials: "include",
          }),
        ]);

        const apptData = await apptRes.json();
        const staffData = await staffRes.json();
        const serviceData = await serviceRes.json();

        if (apptRes.ok) {
          setForm({
            appointment_id: apptData.appointment_id,
            scheduled_time: apptData.scheduled_time,
            user_id: apptData.user_id,
            service_ids: apptData.services
              ? apptData.services.map((s: ServiceResponse) => s.service_id)
              : [apptData.service_id],
            staff_id: apptData.staff_id,
            status: normalizeAppointmentStatus(apptData.status),
            price: apptData.price || 0,
            notes: apptData.notes || "",
          });
        }
        const photosRes = await fetchWithRefresh(
          API_ENDPOINTS.PHOTOS.LIST(appointmentId),
          { credentials: "include" }
        );

        if (photosRes.ok) {
          const photos = await photosRes.json();
          setBeforeImages(photos.filter((p: any) => p.photo_type === "before"));
          setAfterImages(photos.filter((p: any) => p.photo_type === "after"));
        }

        if (staffRes.ok) {
          const normalizedStaff = Array.isArray(staffData)
            ? staffData
            : Array.isArray((staffData as { staff?: Staff[] })?.staff)
            ? (staffData as { staff: Staff[] }).staff
            : [];
          setStaffList(normalizedStaff);
        }
        if (Array.isArray(serviceData))
          setServices(
            serviceData.map((s) => ({ ...s, price: Number(s.price) }))
          );
      } catch (err) {
        console.error("Error loading appointment for edit:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, appointmentId, salonId]);

  if (!isOpen) return null;

  if (loading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl shadow-xl text-center text-gray-500">
          Loading appointment...
        </div>
      </div>
    );

  if (!form) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const dateObj = new Date(form.scheduled_time);
    const dateStr = dateObj.toISOString().split("T")[0];
    const timeStr = dateObj.toISOString().split("T")[1].slice(0, 5);

    const selectedServices = services
      .filter((s) => form.service_ids.includes(s.service_id))
      .map((s) => ({
        service_id: s.service_id,
        duration: s.duration,
        price: s.price,
      }));

    const payload = {
      services: selectedServices,
      staffId: form.staff_id || null,
      scheduledTime: `${dateStr}T${timeStr}`,
      notes: form.notes || "",
      price: Number(form.price) || 0,
      status: form.status,
    };

    try {
      if (appointmentId == null) {
        alert("Invalid appointment ID.");
        setSaving(false);
        return;
      }
      const res = await fetchWithRefresh(
        API_ENDPOINTS.APPOINTMENTS.UPDATE(appointmentId),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to update appointment");
      } else {
        alert("✅ Appointment updated successfully!");
        if (onUpdated) await Promise.resolve(onUpdated());
        setForm(null);
        onClose();
      }
    } catch (err) {
      console.error("Error updating appointment:", err);
      alert("Something went wrong while updating the appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm font-inter ">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto  scrollbar-hide p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-smooth"
          aria-label="Close appointment edit"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <h2 className="text-xl font-semibold text-center mb-6 text-foreground">
          Edit Appointment
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Services <span className="text-red-500">*</span>
            </label>
            <div className="border border-border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {services.map((s) => {
                const checked = form.service_ids.includes(s.service_id);
                return (
                  <label
                    key={s.service_id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        let updated: number[];
                        if (checked) {
                          updated = form.service_ids.filter(
                            (id) => id !== s.service_id
                          );
                        } else {
                          updated = [...form.service_ids, s.service_id];
                        }

                        const total = services
                          .filter((sv) => updated.includes(sv.service_id))
                          .reduce((sum, sv) => sum + sv.price, 0);

                        setForm({
                          ...form,
                          service_ids: updated,
                          price: total,
                        });
                      }}
                      className="accent-primary"
                    />
                    <span className="text-sm">
                      {s.custom_name} (${s.price.toFixed(2)})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Total Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
              title="Enter total price"
              className="w-full border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Staff (optional)
            </label>
            <select
              title="Select staff member"
              value={form.staff_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  staff_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-light"
            >
              <option value="">Auto-assign</option>
              {staffList.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <DatePicker
              selected={new Date(form.scheduled_time)}
              onChange={(date) => {
                if (!date) return;
                const current = new Date(form.scheduled_time);
                current.setFullYear(date.getFullYear());
                current.setMonth(date.getMonth());
                current.setDate(date.getDate());
                setForm({
                  ...form,
                  scheduled_time: current.toISOString(),
                });
              }}
              inline
              minDate={new Date()}
            />
          </div>

          <div>
            <label
              htmlFor="appointment-time"
              className="block text-sm font-medium mb-1"
            >
              Time <span className="text-red-500">*</span>
            </label>
            <input
              id="appointment-time"
              type="time"
              value={new Date(form.scheduled_time)
                .toISOString()
                .split("T")[1]
                .slice(0, 5)}
              onChange={(e) => {
                const current = new Date(form.scheduled_time);
                const [hours, minutes] = e.target.value.split(":");
                current.setHours(Number(hours));
                current.setMinutes(Number(minutes));
                setForm({
                  ...form,
                  scheduled_time: current.toISOString(),
                });
              }}
              className="w-full border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-light"
            />
          </div>
          {/* BEFORE PHOTOS */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Before Photos (URLs)
            </label>

            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newBeforeUrl}
                onChange={(e) => setNewBeforeUrl(e.target.value)}
                placeholder="Paste image URL"
                className="flex-1 border rounded px-2 py-1"
              />

              <button
                type="button"
                onClick={async () => {
                  if (!newBeforeUrl || !appointmentId) return;

                  const response = await fetchWithRefresh(
                    API_ENDPOINTS.PHOTOS.UPLOAD,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        appointment_id: appointmentId,
                        user_id: form.user_id, // if included in apptData
                        staff_id: form.staff_id || null,
                        service_id: form.service_ids[0],
                        photo_type: "before",
                        photo_url: newBeforeUrl,
                      }),
                    }
                  );

                  const data = await response.json();
                  if (response.ok) {
                    setBeforeImages([...beforeImages, data]);
                    setNewBeforeUrl("");
                  } else {
                    alert(data.error || "Failed to add photo");
                  }
                }}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                Add
              </button>
            </div>

            {/* Preview thumbnails */}
            <div className="flex flex-wrap gap-2">
              {beforeImages.map((img, i) => (
                <div key={img.photo_id} className="relative w-20 h-20">
                  <img
                    src={img.photo_url}
                    className="w-full h-full object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetchWithRefresh(
                        API_ENDPOINTS.PHOTOS.DELETE(img.photo_id),
                        { method: "DELETE", credentials: "include" }
                      );

                      if (res.ok) {
                        setBeforeImages(
                          beforeImages.filter(
                            (p) => p.photo_id !== img.photo_id
                          )
                        );
                      } else {
                        alert("Failed to delete image");
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* AFTER PHOTOS */}
          <div>
            <label className="block text-sm font-medium mb-1">
              After Photos (URLs)
            </label>

            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newAfterUrl}
                onChange={(e) => setNewAfterUrl(e.target.value)}
                placeholder="Paste image URL"
                className="flex-1 border rounded px-2 py-1"
              />

              <button
                type="button"
                onClick={async () => {
                  if (!newAfterUrl || !appointmentId) return;

                  const response = await fetchWithRefresh(
                    API_ENDPOINTS.PHOTOS.UPLOAD,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        appointment_id: appointmentId,
                        user_id: form.user_id,
                        staff_id: form.staff_id || null,
                        service_id: form.service_ids[0],
                        photo_type: "after",
                        photo_url: newAfterUrl,
                      }),
                    }
                  );

                  const data = await response.json();
                  if (response.ok) {
                    setAfterImages([...afterImages, data]);
                    setNewAfterUrl("");
                  } else {
                    alert(data.error || "Failed to add photo");
                  }
                }}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {afterImages.map((img) => (
                <div key={img.photo_id} className="relative w-20 h-20">
                  <img
                    src={img.photo_url}
                    className="w-full h-full object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetchWithRefresh(
                        API_ENDPOINTS.PHOTOS.DELETE(img.photo_id),
                        { method: "DELETE", credentials: "include" }
                      );

                      if (res.ok) {
                        setAfterImages(
                          afterImages.filter((p) => p.photo_id !== img.photo_id)
                        );
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              placeholder="Add notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              title="Select appointment status"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: normalizeAppointmentStatus(e.target.value),
                })
              }
              className="w-full border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-light"
            >
              {appointmentStatusOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-2.5 rounded-lg font-semibold text-white ${
              saving
                ? "bg-primary/70 cursor-not-allowed"
                : "bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary transition-smooth"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppointmentEditModal;
