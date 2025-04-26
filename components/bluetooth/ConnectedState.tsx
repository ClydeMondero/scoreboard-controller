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
      console.debug("Sent:", cmd);
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
    setGameData((d) => ({
      ...d,
      homeScore: Math.max(0, d.homeScore - 1),
    }));
    sendCommand("SCR:H-1");
  };

  const decAway = () => {
    setGameData((d) => ({
      ...d,
      awayScore: Math.max(0, d.awayScore - 1),
    }));
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
    <View className="flex-1 bg-[#09090B] p-6 justify-between">
      {/* Edit Score Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-gray-800 rounded-3xl p-6 w-80 shadow-xl">
            <Text className="text-white text-2xl font-semibold text-center mb-6">
              Edit {editingTeam} Score
            </Text>
            <TextInput
              value={tempScore}
              onChangeText={setTempScore}
              keyboardType="numeric"
              maxLength={3}
              autoFocus
              className="bg-gray-700 text-white rounded-lg p-4 text-center text-2xl mb-6"
            />
            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={saveScore}
                className="flex-1 bg-green-600 rounded-lg py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-gray-600 rounded-lg py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Possession Indicator */}
      <View className="items-center mb-8">
        <Text className="text-gray-400 uppercase text-sm mb-2">
          Ball Possession
        </Text>
        {gameData.possession === "HOME" ? (
          <AntDesign name="caretright" size={28} color="green" />
        ) : gameData.possession === "AWAY" ? (
          <AntDesign name="caretleft" size={28} color="yellow" />
        ) : (
          <View style={{ height: 28 }} />
        )}
      </View>

      {/* Scoreboard */}
      <View className="flex-row justify-between items-center mb-10">
        {/* Home Score */}
        <TouchableOpacity
          onPress={() => openEditScore("HOME")}
          className="flex-1 items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">HOME</Text>
          <Text
            className="text-yellow-400 text-7xl font-extrabold"
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {gameData.homeScore}
          </Text>
        </TouchableOpacity>

        {/* Timer & Shot Clock */}
        <View className="flex-1 items-center">
          <View className="w-full items-center mb-6">
            <Text className="text-white text-3xl font-mono">
              {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
                2,
                "0"
              )}
              :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
            </Text>
            <Text className="text-red-600 text-5xl font-bold mt-2">
              {gameData.shotClock}
            </Text>
            <Text className="text-gray-400 uppercase text-xs tracking-widest mt-2">
              Period {gameData.selectedPeriod}
            </Text>
          </View>
          <TouchableOpacity
            onPressIn={() => sendCommand("PRESS")}
            onPressOut={() => sendCommand("RELEASE")}
            className="bg-blue-600 p-4 rounded-full shadow-md"
          >
            <MaterialCommunityIcons
              name="bullhorn-variant"
              size={28}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Away Score */}
        <TouchableOpacity
          onPress={() => openEditScore("AWAY")}
          className="flex-1 items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">AWAY</Text>
          <Text
            className="text-green-500 text-7xl font-extrabold"
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {gameData.awayScore}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Control Buttons */}
      <View className="gap-4">
        {/* Start & Pause */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={handleStart}
            disabled={isTimeRunning}
            className={`flex-1 p-4 rounded-xl ${
              isTimeRunning ? "bg-gray-400" : "bg-green-500"
            }`}
          >
            <Text className="text-white text-center text-xl font-bold">
              START
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePause}
            disabled={!isTimeRunning}
            className={`flex-1 p-4 rounded-xl ${
              !isTimeRunning ? "bg-gray-400" : "bg-blue-500"
            }`}
          >
            <Text className="text-white text-center text-xl font-bold">
              PAUSE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shot Clock Reset */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={handleReset24}
            className="flex-1 bg-red-600 p-4 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-lg">
              RESET 24
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReset14}
            className="flex-1 bg-red-400 p-4 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-lg">
              RESET 14
            </Text>
          </TouchableOpacity>
        </View>

        {/* Score Increments */}
        <View className="flex-row gap-4">
          {/* Home Controls */}
          <View className="flex-1 gap-2">
            <Text className="text-yellow-500 text-center font-bold mb-2">
              HOME
            </Text>
            <View className="flex-row flex-wrap gap-2 justify-center">
              {[1, 2, 3].map((n) => (
                <TouchableOpacity
                  key={`home+${n}`}
                  onPress={() => incHome(n)}
                  className="bg-white p-4 rounded-xl w-[30%] items-center"
                >
                  <Text className="text-yellow-500 font-bold text-lg">
                    +{n}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={decHome}
                className="flex-1 bg-white p-4 rounded-xl w-[30%] items-center"
              >
                <Text className="text-yellow-500 font-bold text-lg">-1</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Away Controls */}
          <View className="flex-1 gap-2">
            <Text className="text-green-500 text-center font-bold mb-2">
              AWAY
            </Text>
            <View className="flex-row flex-wrap gap-2 justify-center">
              {[1, 2, 3].map((n) => (
                <TouchableOpacity
                  key={`away+${n}`}
                  onPress={() => incAway(n)}
                  className="bg-white p-4 rounded-xl w-[30%] items-center"
                >
                  <Text className="text-green-500 font-bold text-lg">+{n}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={decAway}
                className="flex-1 bg-white p-4 rounded-xl w-[30%] items-center"
              >
                <Text className="text-green-500 font-bold text-lg">-1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Possession Buttons */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={setPossessionHome}
            className="flex-1 bg-yellow-500 p-4 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-lg">
              POSSESSION
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={setPossessionAway}
            className="flex-1 bg-green-500 p-4 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-lg">
              POSSESSION
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
