import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Peripheral } from "react-native-ble-manager";
import BleManager from "react-native-ble-manager";

interface Session {
  id: string;
  homeScore: number;
  awayScore: number;
  remainingSeconds: number;
  shotClock: number;
  selectedPeriod: number;
  possession: "HOME" | "AWAY" | "";
}

const DEVICE_SERVICE_UUID = "7140efae-95ea-49d4-9b34-7aea29133e0f";

const Home = ({
  peripherals,
  onScanPress,
  onConnect,
  setGameData,
  bleService,
}: any) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [infoVisible, setInfoVisible] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem("sessions");
        const sessions = jsonValue != null ? JSON.parse(jsonValue) : [];
        setSessions(sessions);
        return sessions;
      } catch (e) {
        console.error(e);
      }
    };

    getData();
    onScanPress();
  }, []);

  const deleteSessions = async () => {
    await AsyncStorage.setItem("sessions", JSON.stringify([]));
    setSessions([]);
  };

  const sendCommand = async (cmd: string) => {
    console.debug("Sending:", cmd);
    if (!bleService) return;
    const data = Array.from(new TextEncoder().encode(cmd));
    try {
      await BleManager.write(
        bleService.peripheralId,
        bleService.serviceId,
        bleService.transfer,
        data,
        data.length
      );
      console.debug("Sent:", cmd);
    } catch (err) {
      console.error("Failed to send command", cmd, err);
    }
  };

  const handleConnect = async (selectedSession: Session) => {
    const targetPeripheral = Array.from(
      peripherals.values() as Iterable<Peripheral>
    ).find(
      (p) =>
        Array.isArray(p.advertising?.serviceUUIDs) &&
        p.advertising.serviceUUIDs.includes(DEVICE_SERVICE_UUID)
    );

    if (targetPeripheral) {
      onConnect(targetPeripheral);
      setGameData(selectedSession); // Set the selected session's data
      const newSessions = sessions.filter((s) => s.id !== selectedSession.id);
      await AsyncStorage.setItem("sessions", JSON.stringify(newSessions));
      setSessions(newSessions);
    } else {
      setInfoVisible(true); // Show modal
      console.warn("No matching peripheral found.");
    }
  };

  return (
    <View className="flex-1 items-center bg-black p-8">
      <Modal
        transparent
        visible={infoVisible}
        animationType="fade"
        onRequestClose={() => {
          setInfoVisible(false);
          onScanPress();
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="bg-white rounded-lg p-6 w-full">
            <Text className="text-lg font-semibold text-black mb-4">
              Scoreboard Not Found
            </Text>
            <Text className="text-black mb-6">
              Make sure the scoreboard is turned on or switch to BLE Mode in the
              manual controller.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setInfoVisible(false);
                onScanPress();
              }}
              className="bg-black py-2 px-4 rounded-md self-end"
            >
              <Text className="text-white">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Text
        className="text-4xl mb-10 text-white"
        style={{ fontFamily: "digital-7" }}
      >
        Scoreboard Controller
      </Text>

      <>
        <View className="w-full gap-4">
          <TouchableOpacity
            className="items-center p-4 bg-white w-full rounded-lg"
            onPress={() =>
              handleConnect({
                id: "",
                homeScore: 0,
                awayScore: 0,
                remainingSeconds: 600,
                shotClock: 24,
                selectedPeriod: 1,
                possession: "",
              })
            }
          >
            <Text className="text-black text-2xl font-medium">New Session</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 mt-8 w-full">
          <View className="flex-row justify-between">
            <Text className="text-white text-2xl mb-4">Recent Sessions</Text>
            <TouchableOpacity onPress={deleteSessions}>
              <Text className="text-white">Delete All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {sessions.map((session, index) => (
              <TouchableOpacity
                key={session.id + index}
                className="bg-black mt-4 p-4 rounded-xl border border-white/25"
                onPress={() => handleConnect(session)} // Pass selected session
              >
                <View className="flex-row justify-between mb-2">
                  <Text
                    className="text-yellow-500 text-4xl "
                    style={{ fontFamily: "digital-7" }}
                  >
                    {session.homeScore} <Text className="text-xl">HOME</Text>
                  </Text>

                  <Text
                    className="text-white text-xl"
                    style={{ fontFamily: "digital-7" }}
                  >
                    VS
                  </Text>
                  <Text
                    className="text-green-500 text-4xl "
                    style={{ fontFamily: "digital-7" }}
                  >
                    {session.awayScore} <Text className="text-xl">AWAY</Text>
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text
                    className="text-white text-2xl"
                    style={{ fontFamily: "digital-7" }}
                  >
                    {String(Math.floor(session.remainingSeconds / 60)).padStart(
                      2,
                      "0"
                    )}
                    :{String(session.remainingSeconds % 60).padStart(2, "0")}
                  </Text>
                  <Text
                    className="text-red-500 text-2xl"
                    style={{ fontFamily: "digital-7" }}
                  >
                    {session.shotClock}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </>
    </View>
  );
};

export default Home;
