import { useCallback, useEffect, useRef, useState } from "react";
import {
	FeatureGroup,
	MapContainer,
	Popup,
	TileLayer,
} from "react-leaflet";
import { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup} from "leaflet";
import "../../../misc/BeautifyMarker/leaflet-beautify-marker-icon.css";
import { Marker as CompMarker } from "@adamscybot/react-leaflet-component-marker";

//import logo from "../snyper4g.png";
import UserLocationMarker from "../MapUserLocationMarker";
import ResetLocation from "../MapControlResetLocation";
import { Link } from "@tanstack/react-router";
import { getPinColor, timeSinceLastUpload } from "@/utils/timeFormat";
import { Deployment } from "@/types";

interface Props {
	deployments: Deployment[];
}

interface IconProps {
	borderColor?: string;
	borderStyle?: string;
	backgroundColor?: string;
	textColor?: string;
	borderWidth?: number;
	iconSize?: [number, number];
}

const DeploymentIcon = ({
	borderColor = "#1EB300",
	borderStyle = "solid",
	backgroundColor = "white",
	textColor = "#000",
	borderWidth = 2,
	iconSize = [28, 28],
}: IconProps) => {
	return (
		<div className={"beautify-marker"}>
			<div
				className={"beautify-marker marker"}
				style={{
					borderColor: borderColor,
					borderStyle: borderStyle,
					backgroundColor: backgroundColor,
					borderWidth: borderWidth,
					marginLeft: -iconSize[0] / 2,
					marginTop: -(iconSize[0] / 4 + 1 + iconSize[0]),
					width: iconSize[0],
					height: iconSize[1],
				}}
			>
				<div
					style={{
						height: "100%",
						width: "100%",
						color: textColor,
					}}
				/>
			</div>
		</div>
	);
};

const DeploymentMap = ({ deployments }: Props) => {
	const featureGroupRef = useRef<LeafletFeatureGroup | null>(null);
  	const [map, setMap] = useState<LeafletMap | null>(null);
	const mapRef = useRef<LeafletMap | null>(null);

	const setBounds = useCallback(() => {
		if (!map || !featureGroupRef.current) return;
		const newBounds = featureGroupRef.current.getBounds();
		map.fitBounds(newBounds);
	}, [map]);

	useEffect(() => {
		setBounds();
	}, [map, setBounds]);

	return (
		<div>
			<MapContainer
				data-testid="map-container"
				ref={mapRef}
				center={[0, 0]}
				zoom={1}
				scrollWheelZoom={true}
				style={{ height: "75vh", width: "100%" }}
				whenReady={() => {
					if (mapRef.current) {
					setMap(mapRef.current);
					}
				}}
			>

				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<FeatureGroup ref={featureGroupRef}>
					{deployments.map((deploymentData) => {
						const latLng = {
							lat: deploymentData.latitude,
							lng: deploymentData.longitude,
						};
						const pinColor = getPinColor(deploymentData.lastUpload);

						return (
							<CompMarker
								key={deploymentData.siteName}
								position={latLng}
								icon={
									<DeploymentIcon
										borderColor={pinColor}
										textColor={pinColor}
									/>
								}
							>
								<Popup>
									<Link
										to="/deployments/$siteName"
										params={{ siteName: deploymentData.siteName }}
										className="text-blue-500 hover:underline mt-2 text-sm"
									>
										View Site: {deploymentData.siteName}
									</Link>
									<div className="mt-2 text-sm">
										Last Upload: {deploymentData.lastUpload
											? timeSinceLastUpload(deploymentData.lastUpload)
											: 'Never'}
									</div>
									<div className="mt-2 text-sm">
										Country: {deploymentData.country}
									</div>
								</Popup>
							</CompMarker>
						);
					})}
				</FeatureGroup>
				<UserLocationMarker data-testid="user-location-marker" />
				<ResetLocation
					data-testid="reset-location-button"
					handleChangeLatLong={() => {
						setBounds();
					}}
				/>
			</MapContainer>
		</div>
	);
};

export default DeploymentMap;
