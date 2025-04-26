import { View, Text, TouchableOpacity, Modal, TextInput } from "react-native";
import React, { useState } from "react";
import { PeripheralServices } from "@/types/bluetooth";
import BleManager from "react-native-ble-manager";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface ConnectedStateProps {
  bleService: PeripheralServices;
  onRead: () => Promise<number[] | undefined>;
  onWrite: () => Promise<void>;
  onDisconnect: (peripheralId: string) => Promise<void>;
}

interface GameData {
  homeScore: number;
  awayScore: number;
  remainingSeconds: number;
  shotClock: number;
  selectedPeriod: number;
  possession: "HOME" | "AWAY" | "";
}

export default function ConnectedState({ bleService }: ConnectedStateProps) {
  const [gameData, setGameData] = useState<GameData>({
    homeScore: 0,
    awayScore: 0,
    remainingSeconds: 600,
    shotClock: 24,
    selectedPeriod: 1,
    possession: "",
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<"HOME" | "AWAY" | "">("");
  const [tempScore, setTempScore] = useState("");
  const [isTimeRunning, setIsTimeRunning] = useState<boolean>(false);

  const sendCommand = async (cmd: string) => {
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
      console.debug("Sent: ", cmd);
    } catch (err) {
      console.error("Failed to send command", cmd, err);
    }
  };

  // Handlers
  const handleStart = () => {
    setIsTimeRunning(true);
    sendCommand("START");
  };
  const handlePause = () => {
    setIsTimeRunning(false);
    sendCommand("PAUSE");
  };
  const handleReset24 = () => sendCommand("SETSHOT:24");
  const handleReset14 = () => sendCommand("SETSHOT:14");

  const incHome = (value: number) => {
    setGameData((d) => ({
      ...d,
      homeScore: Math.min(999, d.homeScore + value),
    }));
    sendCommand(`SCR:H${value}`);
  };
  const incAway = (value: number) => {
    setGameData((d) => ({
      ...d,
      awayScore: Math.min(999, d.awayScore + value),
    }));
    sendCommand(`A${value}`);
  };
  const decHome = () => {
    setGameData((d) => ({ ...d, homeScore: Math.max(0, d.homeScore - 1) }));
    sendCommand("SCR:H-1");
  };
  const decAway = () => {
    setGameData((d) => ({ ...d, awayScore: Math.max(0, d.awayScore - 1) }));
    sendCommand("A-1");
  };

  const setPossessionHome = () => {
    setGameData((d) => ({ ...d, possession: "HOME" }));
    sendCommand("POS:RIGHT");
  };
  const setPossessionAway = () => {
    setGameData((d) => ({ ...d, possession: "AWAY" }));
    sendCommand("POS:LEFT");
  };

  const openEditScore = (team: "HOME" | "AWAY") => {
    setEditingTeam(team);
    setTempScore(
      team === "HOME"
        ? gameData.homeScore.toString()
        : gameData.awayScore.toString()
    );
    setModalVisible(true);
  };

  const saveScore = () => {
    const score = Math.min(999, Math.max(0, parseInt(tempScore) || 0));
    if (editingTeam === "HOME") {
      setGameData((d) => ({ ...d, homeScore: score }));
      sendCommand(`SCR:H${score - gameData.homeScore}`);
    } else if (editingTeam === "AWAY") {
      setGameData((d) => ({ ...d, awayScore: score }));
      sendCommand(`A${score - gameData.awayScore}`);
    }
    setModalVisible(false);
  };

  return (
    <View className="flex-1 bg-[#282828] justify-center gap-8 py-4 px-4">
      {/* Modal for Editing Score */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-[#282828]/75 blur-md">
          <View className="bg-[#282828] rounded-2xl p-6 w-72 shadow-lg items-center">
            <Text className="text-white text-xl font-bold mb-4">
              Edit {editingTeam} Score
            </Text>
            <TextInput
              value={tempScore}
              onChangeText={setTempScore}
              keyboardType="numeric"
              maxLength={3}
              className="border text-white border-neutral-600 rounded-md p-3 w-full text-center text-2xl mb-4"
              autoFocus
            />
            <View className="flex-row space-x-4 gap-2">
              <TouchableOpacity
                onPress={saveScore}
                className="bg-green-500 px-6 py-3 rounded-md"
              >
                <Text className="text-white font-bold text-lg">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-red-500 px-6 py-3 rounded-md"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Possession Indicator */}
      <View className="flex-col justify-center items-center mb-1">
        <Text className="text-white text-xs mb-1">BALL POSSESSION</Text>
        {gameData.possession === "HOME" ? (
          <AntDesign name="caretright" size={28} color="#FFFFFF" />
        ) : gameData.possession === "AWAY" ? (
          <AntDesign name="caretleft" size={28} color="#FFFFFF" />
        ) : (
          <View style={{ height: 28 }} />
        )}
      </View>

      {/* Score Section */}
      <View className="flex-row justify-around items-center mb-2">
        <View className="flex-1 items-center">
          <Text className="text-white text-base font-bold mb-2">HOME</Text>
          <TouchableOpacity onPress={() => openEditScore("HOME")}>
            <Text className="text-yellow-400 text-7xl font-bold">
              {gameData.homeScore}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center gap-2">
          <Text className="text-white text-xs mb-1">PERIOD</Text>
          <Text className="text-white text-2xl tracking-widest font-bold mb-2">
            {Math.floor(gameData.remainingSeconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(gameData.remainingSeconds % 60).toString().padStart(2, "0")}
          </Text>
          <Text className="text-red-500 text-6xl font-extrabold">
            {gameData.shotClock}
          </Text>
          <Text className="text-white text-base mt-2">
            PERIOD {gameData.selectedPeriod}
          </Text>
          <TouchableOpacity
            onPressIn={() => sendCommand("PRESS")}
            onPressOut={() => sendCommand("RELEASE")}
            className="mt-2"
          >
            <MaterialCommunityIcons
              name="bullhorn-variant"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center">
          <Text className="text-white text-base font-bold mb-2">AWAY</Text>
          <TouchableOpacity onPress={() => openEditScore("AWAY")}>
            <Text className="text-green-400 text-7xl font-bold">
              {gameData.awayScore}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Control Buttons */}
      <View>
        {/* Start / Pause */}
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity
            onPress={handleStart}
            className={`p-4 flex-1 mx-1 shadow-md ${
              isTimeRunning ? "bg-gray-300" : "bg-green-500"
            }`}
            disabled={isTimeRunning}
          >
            <Text className="text-white text-center text-xl font-bold">
              START
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePause}
            className={`p-4 flex-1 mx-1 shadow-md ${
              !isTimeRunning ? "bg-gray-300" : "bg-blue-500"
            }`}
            disabled={!isTimeRunning}
          >
            <Text className="text-white text-center text-xl font-bold">
              PAUSE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reset Shot Clock */}
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity
            onPress={handleReset24}
            className="bg-red-600 p-4 flex-1 mx-1 shadow-md"
          >
            <Text className="text-white text-center text-lg font-bold">
              RESET
            </Text>
            <Text className="text-white text-center text-3xl font-bold">
              24
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReset14}
            className="bg-red-400 p-4 flex-1 mx-1 shadow-md"
          >
            <Text className="text-white text-center text-lg font-bold">
              RESET
            </Text>
            <Text className="text-white text-center text-3xl font-bold">
              14
            </Text>
          </TouchableOpacity>
        </View>

        {/* Score Increments */}
        <View className="flex-row justify-between mb-3">
          {[1, 2, 3].map((n, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => incHome(n)}
              className="bg-white p-3 flex-1 mx-1 shadow-md"
            >
              <Text className="text-yellow-500 text-center text-xl font-bold">
                +{n}
              </Text>
            </TouchableOpacity>
          ))}
          {[1, 2, 3].map((n, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => incAway(n)}
              className="bg-white p-3 flex-1 mx-1 shadow-md"
            >
              <Text className="text-green-500 text-center text-xl font-bold">
                +{n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Score Decrements */}
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity
            onPress={decHome}
            className="bg-white p-3 flex-1 mx-1 shadow-md"
          >
            <Text className="text-yellow-500 text-center text-xl font-bold">
              -1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={decAway}
            className="bg-white p-3 flex-1 mx-1 shadow-md"
          >
            <Text className="text-green-500 text-center text-xl font-bold">
              -1
            </Text>
          </TouchableOpacity>
        </View>

        {/* Possession Buttons */}
        <View className="flex-row justify-between">
          <TouchableOpacity
            onPress={setPossessionHome}
            className="bg-yellow-500 p-4 flex-1 mx-1 shadow-md"
          >
            <Text className="text-white text-center text-xl font-bold">
              HOME
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={setPossessionAway}
            className="bg-green-500 p-4 flex-1 mx-1 shadow-md"
          >
            <Text className="text-white text-center text-xl font-bold">
              AWAY
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
