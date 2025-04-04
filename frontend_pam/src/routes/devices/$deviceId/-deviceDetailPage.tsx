import { useParams } from "@tanstack/react-router";
import { bytesToMegabytes } from "@/utils/convertion";
import { Route } from "./index";

export default function DeviceDetailPage() {
  const { deviceId } = useParams({ from: "/devices/$deviceId/" });
  const device = {
    device_ID: deviceId,
    name: "Test Device",
    model: "Test Model",
    deviceStatus: "Active",
    configuration: "summer",
    simCardIcc: "12345",
    simCardBatch: "BATCH1",
    sdCardSize: 32,
    startDate: "2024-04-04",
    endDate: null,
    batteryLevel: 85,
    lastUpload: "2024-04-04",
    folder_size: 1024,
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Device Details</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <p>
          <strong>Device ID:</strong> {device.device_ID}
        </p>
        <p>
          <strong>Name:</strong> {device.name}
        </p>
        <p>
          <strong>Model:</strong> {device.model}
        </p>
        <p>
          <strong>Status:</strong> {device.deviceStatus}
        </p>
        <p>
          <strong>Configuration:</strong> {device.configuration}
        </p>
        <p>
          <strong>SIM Card ICC:</strong> {device.simCardIcc}
        </p>
        <p>
          <strong>SIM Card Batch:</strong> {device.simCardBatch}
        </p>
        <p>
          <strong>SD Card Size:</strong> {device.sdCardSize} GB
        </p>
        <p>
          <strong>Start Date:</strong> {device.startDate}
        </p>
        <p>
          <strong>End Date:</strong> {device.endDate || "N/A"}
        </p>
        <p>
          <strong>Battery Level:</strong> {device.batteryLevel}%
        </p>
        <p>
          <strong>Last Upload:</strong> {device.lastUpload}
        </p>
        <p>
          <strong>Folder Size:</strong> {bytesToMegabytes(device.folder_size)}
        </p>
      </div>

      <h3 className="text-xl font-bold mt-8 mb-4">Deployments</h3>
      {/* Add deployment list or table here */}
    </div>
  );
}
