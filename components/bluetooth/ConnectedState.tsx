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
    <View className="flex-1 bg-[#09090B] justify-center gap-8 py-4 px-4">
      {/* Modal for Editing Score */}
      {/* Modal for Editing Score */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-gray-800 rounded-3xl p-6 w-80 shadow-xl items-center">
            <Text className="text-white text-2xl font-semibold mb-4">
              Edit {editingTeam} Score
            </Text>
            <TextInput
              value={tempScore}
              onChangeText={setTempScore}
              keyboardType="numeric"
              maxLength={3}
              className="bg-gray-700 text-white rounded-lg p-3 w-full text-center text-2xl mb-6"
              autoFocus
            />
            <View className="flex-row space-x-4 w-full">
              <TouchableOpacity
                onPress={saveScore}
                className="flex-1 overflow-hidden rounded-lg"
              >
                <View className="bg-gradient-to-r from-green-400 to-teal-500 py-3 items-center">
                  <Text className="text-white font-bold text-lg">Save</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-gray-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Possession Indicator */}
      <View className="items-center mb-4">
        <Text className="text-gray-400 uppercase text-sm mb-1">
          Ball Possession
        </Text>
        {gameData.possession === "HOME" ? (
          <AntDesign name="caretright" size={28} color="#00BFA6" />
        ) : gameData.possession === "AWAY" ? (
          <AntDesign name="caretleft" size={28} color="#FF5252" />
        ) : (
          <View style={{ height: 28 }} />
        )}
      </View>

      {/* Score Section */}
      <View className="flex-row justify-between items-center mb-6">
        {/* Home */}
        <TouchableOpacity
          onPress={() => openEditScore("HOME")}
          className="flex-1 items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">HOME</Text>
          <Text className="text-green-400 text-8xl font-extrabold">
            {gameData.homeScore}
          </Text>
        </TouchableOpacity>

        {/* Center */}
        <View className="flex-1 items-center">
          <View className="bg-gray-800 rounded-3xl p-4 mb-4 w-full items-center shadow-lg">
            <Text className="text-white text-3xl font-mono">
              {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
                2,
                "0"
              )}
              :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
            </Text>
            <Text className="text-red-400 text-5xl font-bold mt-1">
              {gameData.shotClock}
            </Text>
            <Text className="text-gray-400 uppercase text-xs tracking-wide mt-1">
              Period {gameData.selectedPeriod}
            </Text>
          </View>
          <TouchableOpacity
            onPressIn={() => sendCommand("PRESS")}
            onPressOut={() => sendCommand("RELEASE")}
            className="p-3 bg-blue-600 rounded-full shadow-md"
          >
            <MaterialCommunityIcons
              name="bullhorn-variant"
              size={28}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Away */}
        <TouchableOpacity
          onPress={() => openEditScore("AWAY")}
          className="flex-1 items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">AWAY</Text>
          <Text className="text-red-400 text-8xl font-extrabold">
            {gameData.awayScore}
          </Text>
        </TouchableOpacity>
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
