// // components/LocationGuard.tsx

// "use client";

// import { useEffect, useState } from "react";

// const OFFICE_LAT =
//   typeof process !== "undefined" && process.env.NEXT_PUBLIC_OFFICE_LAT
//     ? Number(process.env.NEXT_PUBLIC_OFFICE_LAT)
//     : 28.6435;

// const OFFICE_LNG =
//   typeof process !== "undefined" && process.env.NEXT_PUBLIC_OFFICE_LNG
//     ? Number(process.env.NEXT_PUBLIC_OFFICE_LNG)
//     : 77.1120;

// // Allowed distance from office in meters
// const OFFICE_RADIUS_METERS =
//   typeof process !== "undefined" && process.env.NEXT_PUBLIC_OFFICE_RADIUS_METERS
//     ? Number(process.env.NEXT_PUBLIC_OFFICE_RADIUS_METERS)
//     : 200;

// type LocationStatus =
//   | "checking"
//   | "valid"
//   | "invalid"
//   | "permission";

// function calculateDistance(
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ): number {
//   const EARTH_RADIUS_METERS = 6371000;

//   const toRadians = (degrees: number) => {
//     return (degrees * Math.PI) / 180;
//   };

//   const dLat = toRadians(lat2 - lat1);
//   const dLon = toRadians(lon2 - lon1);

//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRadians(lat1)) *
//       Math.cos(toRadians(lat2)) *
//       Math.sin(dLon / 2) ** 2;

//   const c =
//     2 *
//     Math.atan2(
//       Math.sqrt(a),
//       Math.sqrt(1 - a)
//     );

//   return EARTH_RADIUS_METERS * c;
// }

// export default function LocationGuard({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [status, setStatus] =
//     useState<LocationStatus>("checking");

//   const [distance, setDistance] =
//     useState<number | null>(null);

//   const [errorMessage, setErrorMessage] =
//     useState("");

//   const checkLocation = () => {
//     setStatus("checking");
//     setDistance(null);
//     setErrorMessage("");

//     if (!navigator.geolocation) {
//       setStatus("permission");

//       setErrorMessage(
//         "Your browser does not support location services."
//       );

//       return;
//     }

//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         const userLatitude =
//           position.coords.latitude;

//         const userLongitude =
//           position.coords.longitude;

//         console.log(
//           "USER LATITUDE:",
//           userLatitude
//         );

//         console.log(
//           "USER LONGITUDE:",
//           userLongitude
//         );

//         const calculatedDistance =
//           calculateDistance(
//             userLatitude,
//             userLongitude,
//             OFFICE_LAT,
//             OFFICE_LNG
//           );

//         console.log(
//           "OFFICE DISTANCE:",
//           Math.round(calculatedDistance),
//           "meters"
//         );

//         setDistance(calculatedDistance);

//         if (
//           calculatedDistance <=
//           OFFICE_RADIUS_METERS
//         ) {
//           console.log(
//             "LOCATION VALID - ACCESS ALLOWED"
//           );

//           setStatus("valid");
//         } else {
//           console.log(
//             "LOCATION INVALID - ACCESS DENIED"
//           );

//           setStatus("invalid");
//         }
//       },

//       (error) => {
//         console.error(
//           "GEOLOCATION ERROR:",
//           error
//         );

//         setStatus("permission");

//         switch (error.code) {
//           case error.PERMISSION_DENIED:
//             setErrorMessage(
//               "Location permission was denied. Please allow location access and try again."
//             );
//             break;

//           case error.POSITION_UNAVAILABLE:
//             setErrorMessage(
//               "Your current location could not be determined. Please check your device location settings."
//             );
//             break;

//           case error.TIMEOUT:
//             setErrorMessage(
//               "Location request timed out. Please try again."
//             );
//             break;

//           default:
//             setErrorMessage(
//               "Unable to determine your current location."
//             );
//         }
//       },

//       {
//         enableHighAccuracy: true,

//         timeout: 15000,

//         // Cache recent location within 30 seconds
//         maximumAge: 30000,
//       }
//     );
//   };

//   useEffect(() => {
//     checkLocation();
//   }, []);

//   /*
//    * LOCATION CHECKING
//    */
//   if (status === "checking") {
//     return (
//       <main className="min-h-screen bg-white flex items-center justify-center px-6">
//         <div className="w-full max-w-md text-center">
//           <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
//             <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
//           </div>

//           <h3 className="text-2xl font-semibold text-gray-900">
//             Checking your location
//           </h3>

//           <p className="mt-3 text-gray-500">
//             Please wait while we verify your
//             current location.
//           </p>

//           <p className="mt-2 text-sm text-gray-400">
//             Please allow location access when your
//             browser asks for permission.
//           </p>
//         </div>
//       </main>
//     );
//   }

//   /*
//    * LOCATION PERMISSION / GPS ERROR
//    */
//   if (status === "permission") {
//     return (
//       <main className="min-h-screen bg-white flex items-center justify-center px-6">
//         <div className="w-full max-w-md text-center">
//           <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
//             <span className="text-2xl">
//               📍
//             </span>
//           </div>

//           <h4 className="text-2xl font-semibold text-gray-900">
//             Location access required
//           </h4>

//           <p className="mt-4 text-gray-600">
//             {errorMessage ||
//               "We need your current location to verify that you are at an authorized office location."}
//           </p>

//           <button
//             type="button"
//             onClick={checkLocation}
//             className="mt-6 rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
//           >
//             Try Again
//           </button>

//           <p className="mt-5 text-xs text-gray-400">
//             Please make sure location services are
//             enabled on your device and browser.
//           </p>
//         </div>
//       </main>
//     );
//   }

//   /*
//    * LOCATION INVALID
//    */
//   if (status === "invalid") {
//     return (
//       <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
//         <div className="w-full max-w-lg">
//           <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
//             <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
//               <span className="text-3xl text-red-600">
//                 !
//               </span>
//             </div>

//             <h3 className="text-2xl font-bold text-gray-900">
//               Location not valid
//             </h3>

//             <p className="mt-4 text-gray-600">
//               You are currently outside the authorized
//               office location.
//             </p>

//             <div className="mt-6 rounded-xl bg-gray-50 p-4">
//               <p className="text-sm text-gray-500">
//                 Authorized office location
//               </p>

//               <p className="mt-1 font-medium text-gray-900">
//                 Office Location
//               </p>

//               <p className="mt-2 text-xs text-gray-400">
//                 Latitude: {OFFICE_LAT}
//                 <br />
//                 Longitude: {OFFICE_LNG}
//               </p>
//             </div>

//             {distance !== null && (
//               <p className="mt-5 text-sm text-gray-500">
//                 Your current location is approximately{" "}
//                 <strong className="text-gray-900">
//                   {Math.round(distance)} meters
//                 </strong>{" "}
//                 from the authorized office.
//               </p>
//             )}

//             <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">
//               <p className="text-sm font-medium text-red-800">
//                 If you are a valid user, please contact
//                 the administrator.
//               </p>
//             </div>

//             <button
//               type="button"
//               onClick={checkLocation}
//               className="mt-6 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
//             >
//               Check Location Again
//             </button>
//           </div>
//         </div>
//       </main>
//     );
//   }

//   /*
//    * LOCATION VALID
//    *
//    * Only here will the actual homepage render.
//    */
//   return <>{children}</>;
// }


"use client";

import { useCallback, useEffect, useState } from "react";

const OFFICE_LAT =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_OFFICE_LAT
    ? Number(process.env.NEXT_PUBLIC_OFFICE_LAT)
    : 28.6435;

const OFFICE_LNG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_OFFICE_LNG
    ? Number(process.env.NEXT_PUBLIC_OFFICE_LNG)
    : 77.1120;

// Allowed distance from office in meters
const OFFICE_RADIUS_METERS =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_OFFICE_RADIUS_METERS
    ? Number(process.env.NEXT_PUBLIC_OFFICE_RADIUS_METERS)
    : 200;

// Maximum acceptable GPS/location uncertainty.
// Example: 500 means we don't trust readings with accuracy worse than ±500m.
const MAX_LOCATION_ACCURACY_METERS = 500;

// Number of location readings to collect
const REQUIRED_READINGS = 3;

// Maximum time allowed for each location request
const LOCATION_TIMEOUT = 20000;

type LocationStatus =
  | "checking"
  | "valid"
  | "invalid"
  | "permission";

type LocationReading = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000;

  const toRadians = (degrees: number) => {
    return (degrees * Math.PI) / 180;
  };

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return EARTH_RADIUS_METERS * c;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT,
        maximumAge: 0,
      }
    );
  });
}

export default function LocationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] =
    useState<LocationStatus>("checking");

  const [distance, setDistance] =
    useState<number | null>(null);

  const [accuracy, setAccuracy] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const checkLocation = useCallback(async () => {
    setStatus("checking");
    setDistance(null);
    setAccuracy(null);
    setErrorMessage("");

    if (!navigator.geolocation) {
      setStatus("permission");

      setErrorMessage(
        "Your browser does not support location services."
      );

      return;
    }

    const readings: LocationReading[] = [];

    console.log(
      `Starting location verification. Collecting ${REQUIRED_READINGS} readings...`
    );

    for (let i = 0; i < REQUIRED_READINGS; i++) {
      try {
        console.log(
          `Getting location reading ${i + 1}/${REQUIRED_READINGS}...`
        );

        const position =
          await getCurrentPosition();

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        const locationAccuracy =
          position.coords.accuracy;

        const timestamp =
          position.timestamp;

        console.log(
          `Reading ${i + 1}:`,
          {
            latitude,
            longitude,
            accuracy: locationAccuracy,
            timestamp,
          }
        );

        // Ignore impossible coordinates
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          !Number.isFinite(locationAccuracy)
        ) {
          console.warn(
            "Invalid location data received."
          );

          continue;
        }

        readings.push({
          latitude,
          longitude,
          accuracy: locationAccuracy,
          timestamp,
        });

        // Small delay between readings so the browser
        // has a chance to obtain a better location.
        if (i < REQUIRED_READINGS - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000)
          );
        }
      } catch (error) {
        console.warn(
          `Location reading ${i + 1} failed:`,
          error
        );
      }
    }

    /*
     * No successful readings
     */
    if (readings.length === 0) {
      setStatus("permission");

      setErrorMessage(
        "Unable to determine your current location. Please enable Windows Location Services, allow location access for this website, and try again."
      );

      return;
    }

    /*
     * Select the reading with the BEST accuracy.
     *
     * Smaller accuracy value = better.
     *
     * Example:
     *
     * Reading 1: ±5000m
     * Reading 2: ±800m
     * Reading 3: ±70m
     *
     * We use Reading 3.
     */
    const bestReading = [...readings].sort(
      (a, b) => a.accuracy - b.accuracy
    )[0];

    console.log(
      "BEST LOCATION READING:",
      bestReading
    );

    setAccuracy(bestReading.accuracy);

    /*
     * Reject extremely inaccurate location readings.
     */
    if (
      bestReading.accuracy >
      MAX_LOCATION_ACCURACY_METERS
    ) {
      console.warn(
        "Location accuracy is too low:",
        bestReading.accuracy
      );

      setStatus("permission");

      setErrorMessage(
        `Your device reported an inaccurate location (±${Math.round(
          bestReading.accuracy
        )} meters). Please enable Windows Location Services, allow browser location access, and try again.`
      );

      return;
    }

    /*
     * Calculate distance from office.
     */
    const calculatedDistance =
      calculateDistance(
        bestReading.latitude,
        bestReading.longitude,
        OFFICE_LAT,
        OFFICE_LNG
      );

    console.log(
      "================================"
    );

    console.log("LOCATION VERIFICATION");

    console.log(
      "User Latitude:",
      bestReading.latitude
    );

    console.log(
      "User Longitude:",
      bestReading.longitude
    );

    console.log(
      "Location Accuracy:",
      Math.round(bestReading.accuracy),
      "meters"
    );

    console.log(
      "Office Latitude:",
      OFFICE_LAT
    );

    console.log(
      "Office Longitude:",
      OFFICE_LNG
    );

    console.log(
      "Distance:",
      Math.round(calculatedDistance),
      "meters"
    );

    console.log(
      "Allowed Radius:",
      OFFICE_RADIUS_METERS,
      "meters"
    );

    console.log(
      "================================"
    );

    setDistance(calculatedDistance);

    /*
     * Final office geofence check.
     */
    if (
      calculatedDistance <=
      OFFICE_RADIUS_METERS
    ) {
      console.log(
        "LOCATION VALID - ACCESS ALLOWED"
      );

      setStatus("valid");
    } else {
      console.log(
        "LOCATION INVALID - ACCESS DENIED"
      );

      setStatus("invalid");
    }
  }, []);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  /*
   * LOCATION CHECKING
   */
  if (status === "checking") {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
          </div>

          <h3 className="text-2xl font-semibold text-gray-900">
            Checking your location
          </h3>

          <p className="mt-3 text-gray-500">
            Please wait while we verify your
            current location.
          </p>

          <p className="mt-2 text-sm text-gray-400">
            We are getting a fresh location reading.
          </p>

        </div>
      </main>
    );
  }

  /*
   * LOCATION PERMISSION / GPS ERROR
   */
  if (status === "permission") {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <span className="text-2xl">
              📍
            </span>
          </div>

          <h4 className="text-2xl font-semibold text-gray-900">
            Location access required
          </h4>

          <p className="mt-4 text-gray-600">
            {errorMessage ||
              "We need your current location to verify that you are at an authorized office location."}
          </p>

          {accuracy !== null && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                Detected location accuracy
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                ±{Math.round(accuracy)} meters
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={checkLocation}
            className="mt-6 rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Try Again
          </button>

          <p className="mt-5 text-xs text-gray-400">
            Make sure Windows Location Services and
            browser location permission are enabled.
          </p>

        </div>
      </main>
    );
  }

  /*
   * LOCATION INVALID
   */
  if (status === "invalid") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-lg">

          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl text-red-600">
                !
              </span>
            </div>

            <h3 className="text-2xl font-bold text-gray-900">
              Location not valid
            </h3>

            <p className="mt-4 text-gray-600">
              You are currently outside the
              authorized office location.
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-4">

              <p className="text-sm text-gray-500">
                Authorized office location
              </p>

              <p className="mt-1 font-medium text-gray-900">
                Office Location
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Latitude: {OFFICE_LAT}
                <br />
                Longitude: {OFFICE_LNG}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Allowed radius:{" "}
                {OFFICE_RADIUS_METERS} meters
              </p>

            </div>

            {distance !== null && (
              <p className="mt-5 text-sm text-gray-500">
                Your current location is approximately{" "}
                <strong className="text-gray-900">
                  {Math.round(distance)} meters
                </strong>{" "}
                from the authorized office.
              </p>
            )}

            {accuracy !== null && (
              <p className="mt-2 text-xs text-gray-400">
                Location accuracy: ±
                {Math.round(accuracy)} meters
              </p>
            )}

            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                If you are physically at the office,
                make sure Windows Location Services
                and browser location access are enabled.
              </p>
            </div>

            <button
              type="button"
              onClick={checkLocation}
              className="mt-6 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Check Location Again
            </button>

          </div>

        </div>
      </main>
    );
  }

  /*
   * LOCATION VALID
   *
   * Only here will the actual application render.
   */
  return <>{children}</>;
}

