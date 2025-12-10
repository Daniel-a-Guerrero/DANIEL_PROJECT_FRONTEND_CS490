"use client";

import React, { useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Check } from "lucide-react";
import Image from "next/image";
import {
  uploadAppointmentPhoto,
  getAppointmentPhotos,
  getPhotoUrl,
  ServicePhoto,
} from "@/libs/api/photos";

interface AppointmentPhotoUploadProps {
  appointmentId: number;
  staffId?: number;
  serviceId?: number;
}

const AppointmentPhotoUpload: React.FC<AppointmentPhotoUploadProps> = ({
  appointmentId,
  staffId,
  serviceId,
}) => {
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<"before" | "after">("before");
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPhotos();
  }, [appointmentId]);

  const fetchPhotos = async () => {
    setLoading(true);
    const result = await getAppointmentPhotos(appointmentId);
    if (result.photos) {
      setPhotos(result.photos);
    } else if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError("File size must be less than 10MB");
        return;
      }

      setPreviewFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!previewFile) {
      setError("Please select a photo");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    console.log(`appt ID: ${appointmentId} photoIS ${selectedType} and ${previewFile} staff ${staffId} service ${serviceId}`);
    const result = await uploadAppointmentPhoto({
      appointment_id: appointmentId,
      photo_type: selectedType,
      photo: previewFile,
      staff_id: staffId,
      service_id: serviceId,
    });

    if (result.success) {
      setMessage(`${selectedType === "before" ? "Before" : "After"} photo uploaded successfully!`);
      setPreviewFile(null);
      setPreviewUrl("");
      fetchPhotos();
      setTimeout(() => setMessage(""), 3000);
    } else {
      setError(result.error || "Failed to upload photo");
    }

    setUploading(false);
  };

  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Loading photos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        Before & After Photos
      </h3>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Existing Photos */}
      <div className="grid grid-cols-2 gap-4">
        {/* Before Photos */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Before ({beforePhotos.length})
          </h4>
          <div className="space-y-2">
            {beforePhotos.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">No before photos</p>
              </div>
            ) : (
              beforePhotos.map((photo) => (
                <div
                  key={photo.photo_id}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border"
                >
                  <Image
                    src={getPhotoUrl(photo.photo_url)}
                    alt="Before"
                    fill
                    className="object-cover"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* After Photos */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            After ({afterPhotos.length})
          </h4>
          <div className="space-y-2">
            {afterPhotos.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">No after photos</p>
              </div>
            ) : (
              afterPhotos.map((photo) => (
                <div
                  key={photo.photo_id}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border"
                >
                  <Image
                    src={getPhotoUrl(photo.photo_url)}
                    alt="After"
                    fill
                    className="object-cover"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-3">Add a new photo</p>

        {/* Photo Type Selector */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSelectedType("before")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === "before"
                ? "bg-primary text-white"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            Before
          </button>
          <button
            onClick={() => setSelectedType("after")}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === "after"
                ? "bg-primary text-white"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            After
          </button>
        </div>

        {/* File Input */}
        <div className="mb-3">
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
              {previewUrl ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setPreviewFile(null);
                      setPreviewUrl("");
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload a {selectedType} photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </>
              )}
            </div>
          </label>
        </div>

        {/* Upload Button */}
        {previewFile && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? "Uploading..." : `Upload ${selectedType} Photo`}
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentPhotoUpload;

