import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { PeripheralServices } from "@/types/bluetooth";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeEventEmitter, NativeModules } from "react-native";
import BleManager, {
  BleManagerDidUpdateValueForCharacteristicEvent,
} from "react-native-ble-manager";

interface ConnectedStateProps {
  bleService: PeripheralServices | undefined;
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [gameData, setGameData] = useState<GameData>({
    homeScore: 0,
    awayScore: 0,
    remainingSeconds: 600,
    shotClock: 24,
    selectedPeriod: 1,
    possession: "",
  });

  // Modal visibility and temp inputs
  const [modalVisible, setModalVisible] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [shotClockModalVisible, setShotClockModalVisible] = useState(false);

  const [tempPeriod, setTempPeriod] = useState("");
  const [tempScore, setTempScore] = useState("");
  const [tempMinutes, setTempMinutes] = useState("");
  const [tempSeconds, setTempSeconds] = useState("");
  const [tempShot, setTempShot] = useState("");

  const [editingTeam, setEditingTeam] = useState<"HOME" | "AWAY" | "">("");
  const [isTimeRunning, setIsTimeRunning] = useState<boolean>(false);

  // create a BLE event emitter
  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  useEffect(() => {
    if (!bleService) return;

    // 1️⃣ tell the native module to START sending you notifies on that char
    BleManager.startNotification(
      bleService.peripheralId,
      bleService.serviceId,
      bleService.notifyTransfer
    )
      .then(() => console.log("✔️ Notifications started"))
      .catch((err) => console.warn("❌ startNotification failed", err));

    // 2️⃣ listen for incoming packets
    const sub = bleManagerEmitter.addListener(
      "BleManagerDidUpdateValueForCharacteristic",
      (event: BleManagerDidUpdateValueForCharacteristicEvent) => {
        // ignore everything except our peripheral + char
        if (
          event.peripheral !== bleService.peripheralId ||
          event.characteristic !== bleService.notifyTransfer
        ) {
          return;
        }

        // event.value is number[] of bytes
        const raw = String.fromCharCode(...event.value);
        // match "TMM:SS,SCC"
        const m = raw.match(/T(\d\d):(\d\d),S(\d\d)/);
        if (m) {
          const [, mm, ss, cc] = m;
          const newSeconds = parseInt(mm, 10) * 60 + parseInt(ss, 10);
          const newShot = parseInt(cc, 10);
          setGameData((d) => ({
            ...d,
            remainingSeconds: newSeconds,
            shotClock: newShot,
          }));
        }
      }
    );

    // 3️⃣ cleanup on unmount or service change
    return () => {
      sub.remove();
      BleManager.stopNotification(
        bleService.peripheralId,
        bleService.serviceId,
        bleService.notifyTransfer
      ).catch(() => {});
    };
  }, [bleService]);

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
  const handleResetAll = () => {
    setGameData({
      homeScore: 0,
      awayScore: 0,
      remainingSeconds: 600,
      shotClock: 24,
      selectedPeriod: 1,
      possession: "",
    });
    sendCommand("RESET");
  };

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

  const openEditPeriod = () => {
    setIsTimeRunning(false);
    setTempPeriod(gameData.selectedPeriod.toString());
    setPeriodModalVisible(true);
  };

  const openEditTimer = () => {
    setIsTimeRunning(false);
    const mins = Math.floor(gameData.remainingSeconds / 60);
    const secs = gameData.remainingSeconds % 60;
    setTempMinutes(mins.toString().padStart(2, "0"));
    setTempSeconds(secs.toString().padStart(2, "0"));
    setTimerModalVisible(true);
  };
  const openEditShotClock = () => {
    setIsTimeRunning(false);
    setTempShot(gameData.shotClock.toString());
    setShotClockModalVisible(true);
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

  const savePeriod = () => {
    const period = Math.min(9, Math.max(1, parseInt(tempPeriod) || 1));
    setGameData((d) => ({ ...d, selectedPeriod: period }));
    sendCommand(`SETPERIOD:${period - gameData.selectedPeriod}`);
    setPeriodModalVisible(false);
  };

  const saveTimer = () => {
    const mins = Math.max(0, parseInt(tempMinutes) || 0);
    const secs = Math.min(59, Math.max(0, parseInt(tempSeconds) || 0));
    const total = mins * 60 + secs;
    sendCommand(`TIME:${total}`);
    setGameData((d) => ({ ...d, remainingSeconds: total }));
    setTimerModalVisible(false);
  };

  const saveShotClock = () => {
    const shot = Math.max(0, Math.min(99, parseInt(tempShot) || 0));
    sendCommand(`SETSHOT:${shot}`);
    setGameData((d) => ({ ...d, shotClock: shot }));
    setShotClockModalVisible(false);
  };

  const renderScoreTimerPortrait = () => (
    <View className="justify-center items-center">
      {/* Possession */}
      <View className="items-center mb-6">
        <Text className="text-gray-400 uppercase text-sm mb-2">
          Ball Possession
        </Text>
        {gameData.possession === "HOME" ? (
          <AntDesign name="caretleft" size={28} color="yellow" />
        ) : gameData.possession === "AWAY" ? (
          <AntDesign name="caretright" size={28} color="green" />
        ) : (
          <View style={{ height: 28 }} />
        )}
      </View>

      {/* Scores and Timer */}
      <View className="flex-row items-center justify-between w-full px-10 mb-6">
        {/* Home */}
        <TouchableOpacity
          onPress={() => openEditScore("HOME")}
          className="items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">HOME</Text>
          <Text
            className="text-yellow-400 text-7xl font-extrabold"
            style={{ fontFamily: "digital-7" }}
          >
            {gameData.homeScore}
          </Text>
        </TouchableOpacity>

        {/* Timer */}
        <View className="items-center">
          <TouchableOpacity onPress={openEditTimer}>
            <Text className="text-white text-3xl font-mono">
              {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
                2,
                "0"
              )}
              :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditShotClock}>
            <Text className="text-red-600 text-5xl font-bold mt-2">
              {gameData.shotClock}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openEditPeriod}>
            <Text className="text-gray-400 uppercase text-xs tracking-widest mt-2">
              Period {gameData.selectedPeriod}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Away */}
        <TouchableOpacity
          onPress={() => openEditScore("AWAY")}
          className="items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">AWAY</Text>
          <Text className="text-green-500 text-7xl font-extrabold">
            {gameData.awayScore}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row justify-between gap-6">
        {/* Horn Button */}
        <TouchableOpacity
          className="bg-yellow-400 p-4  shadow-md mt-4"
          onPress={setPossessionHome}
        >
          <AntDesign name="caretleft" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPressIn={() => sendCommand("PRESS")}
          onPressOut={() => sendCommand("RELEASE")}
          className="bg-blue-600 p-4  shadow-md mt-4"
        >
          <MaterialCommunityIcons
            name="bullhorn-variant"
            size={28}
            color="#FFF"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={setPossessionAway}
          className="bg-green-500 p-4  shadow-md mt-4"
        >
          <AntDesign name="caretright" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScoreTimerLandscape = () => (
    <View className="flex-1 justify-center items-center">
      {/* Possession */}
      <View className="items-center mb-6">
        <Text className="text-gray-400 uppercase text-sm mb-2">
          Ball Possession
        </Text>
        {gameData.possession === "HOME" ? (
          <AntDesign name="caretleft" size={28} color="yellow" />
        ) : gameData.possession === "AWAY" ? (
          <AntDesign name="caretright" size={28} color="green" />
        ) : (
          <View style={{ height: 28 }} />
        )}
      </View>

      {/* Scores and Timer */}
      <View className="flex-row items-center justify-between w-full px-10 mb-6">
        {/* Home */}
        <TouchableOpacity
          onPress={() => openEditScore("HOME")}
          className="items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">HOME</Text>
          <Text className="text-yellow-400 text-6xl font-extrabold">
            {gameData.homeScore}
          </Text>
        </TouchableOpacity>

        {/* Timer */}
        <View className="items-center">
          <TouchableOpacity onPress={openEditTimer}>
            <Text className="text-white text-3xl font-mono">
              {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
                2,
                "0"
              )}
              :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditShotClock}>
            <Text className="text-red-600 text-5xl font-bold mt-2">
              {gameData.shotClock}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openEditPeriod}>
            <Text className="text-gray-400 uppercase text-xs tracking-widest mt-2">
              Period {gameData.selectedPeriod}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Away */}
        <TouchableOpacity
          onPress={() => openEditScore("AWAY")}
          className="items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">AWAY</Text>
          <Text className="text-green-500 text-6xl font-extrabold">
            {gameData.awayScore}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between gap-6">
        {/* Horn Button */}
        <TouchableOpacity
          className="bg-yellow-400 p-4  shadow-md mt-4"
          onPress={setPossessionHome}
        >
          <AntDesign name="caretleft" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPressIn={() => sendCommand("PRESS")}
          onPressOut={() => sendCommand("RELEASE")}
          className="bg-blue-600 p-4  shadow-md mt-4"
        >
          <MaterialCommunityIcons
            name="bullhorn-variant"
            size={28}
            color="#FFF"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={setPossessionAway}
          className="bg-green-500 p-4  shadow-md mt-4"
        >
          <AntDesign name="caretright" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderControlsLandscape = () => (
    <View className="gap-6 px-4 py-6 flex-1 justify-evenly">
      {/* Start & Reset | Pause & Reset */}
      <View className="flex-row justify-evenly gap-6">
        {/* Start & Pause Column */}
        <TouchableOpacity
          onPress={isTimeRunning ? handlePause : handleStart}
          className={`justify-center lp-4  w-28 ${
            isTimeRunning ? "bg-blue-500" : "bg-green-500"
          }`}
        >
          <Text className="text-white text-center text-lg font-bold">
            {isTimeRunning ? "PAUSE" : "START"}
          </Text>
        </TouchableOpacity>

        {/* Reset Buttons Column */}
        <View className="gap-4">
          <TouchableOpacity
            onPress={handleReset24}
            className="bg-red-800 p-4  w-28"
          >
            <Text className="text-white text-center text-base font-bold">
              RESET 24
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReset14}
            className="bg-red-600 p-4  w-28"
          >
            <Text className="text-white text-center text-base font-bold">
              RESET 14
            </Text>
          </TouchableOpacity>
        </View>
        <View className="gap-4 flex-1 justify-center">
          <TouchableOpacity
            onPress={handleResetAll}
            className="flex-1 justify-center items-center-center bg-red-400 p-4  w-28"
          >
            <Text className="text-white text-center text-base font-bold">
              RESET All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Score Increments */}
      <View className="flex-row gap-6">
        {/* Home Controls */}
        <View className="flex-1 gap-2">
          <Text className="text-yellow-500 text-center font-bold mb-1">
            HOME
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <TouchableOpacity
                key={`home+${n}`}
                onPress={() => incHome(n)}
                className="bg-white w-16 h-16  justify-center items-center"
              >
                <Text className="text-yellow-500 font-bold text-lg">+{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={decHome}
              className="bg-white w-16 h-16  justify-center items-center"
            >
              <Text className="text-yellow-500 font-bold text-lg">-1</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Away Controls */}
        <View className="flex-1 gap-2">
          <Text className="text-green-500 text-center font-bold mb-1">
            AWAY
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <TouchableOpacity
                key={`away+${n}`}
                onPress={() => incAway(n)}
                className="bg-white w-16 h-16  justify-center items-center"
              >
                <Text className="text-green-500 font-bold text-lg">+{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={decAway}
              className="bg-white w-16 h-16  justify-center items-center"
            >
              <Text className="text-green-500 font-bold text-lg">-1</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderControlsPortrait = () => (
    <View className="gap-4">
      {/* Start & Pause */}
      <View className="flex-row gap-4">
        <TouchableOpacity
          onPress={handleStart}
          disabled={isTimeRunning}
          className={`flex-1 p-4  ${
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
          className={`flex-1 p-4  ${
            !isTimeRunning ? "bg-gray-400" : "bg-blue-500"
          }`}
        >
          <Text className="text-white text-center text-xl font-bold">
            PAUSE
          </Text>
        </TouchableOpacity>
      </View>

      {/* Shot Clock Reset */}
      <View className="flex-row flex-wrap gap-4">
        <TouchableOpacity
          onPress={handleResetAll}
          className="flex-1 bg-red-400 p-4 "
        >
          <Text className="text-white text-center font-bold text-lg">
            RESET All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReset14}
          className="flex-1 bg-red-600 p-4 "
        >
          <Text className="text-white text-center font-bold text-lg">
            RESET 14
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReset24}
          className="flex-1 bg-red-800 p-4 "
        >
          <Text className="text-white text-center font-bold text-lg">
            RESET 24
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
                className="bg-white p-4  w-[30%] items-center"
              >
                <Text className="text-yellow-500 font-bold text-lg">+{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={decHome}
              className="flex-1 bg-white p-4  w-[30%] items-center"
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
                className="bg-white p-4  w-[30%] items-center"
              >
                <Text className="text-green-500 font-bold text-lg">+{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={decAway}
              className="flex-1 bg-white p-4  w-[30%] items-center"
            >
              <Text className="text-green-500 font-bold text-lg">-1</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B] p-6">
      {/* Edit Score Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-gray-800/50 justify-center items-center">
          <View className="bg-black  p-6 w-80 border-neutral-400 shadow-xl">
            <Text className="text-white text-2xl font-semibold text-center mb-6">
              Edit {editingTeam} Score
            </Text>
            <TextInput
              value={tempScore}
              onChangeText={setTempScore}
              keyboardType="numeric"
              maxLength={3}
              autoFocus
              className="bg-gray-100 text-black  p-4 text-center text-2xl mb-6"
            />
            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={saveScore}
                className="flex-1 bg-green-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-gray-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Period Modal */}
      <Modal
        transparent
        visible={periodModalVisible}
        animationType="fade"
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <View className="flex-1 bg-gray-800/50 justify-center items-center">
          <View className="bg-black  p-6 w-80 border-neutral-400 shadow-xl">
            <Text className="text-white text-2xl font-semibold text-center mb-6">
              Change Period
            </Text>

            <TextInput
              value={tempPeriod}
              onChangeText={setTempPeriod}
              keyboardType="numeric"
              maxLength={1}
              autoFocus
              className="bg-gray-100 text-black  p-4 text-center text-2xl mb-6"
            />

            <View className="flex-row gap-4 mt-6">
              <TouchableOpacity
                onPress={savePeriod}
                className="flex-1 bg-green-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPeriodModalVisible(false)}
                className="flex-1 bg-gray-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Timer Modal */}
      <Modal
        transparent
        visible={timerModalVisible}
        animationType="fade"
        onRequestClose={() => setTimerModalVisible(false)}
      >
        <View className="flex-1 bg-gray-800/50 justify-center items-center">
          <View className="bg-black  p-6 w-80 border-neutral-400 shadow-xl">
            <Text className="text-white text-2xl font-semibold text-center mb-6">
              Set Game Timer
            </Text>
            <View className="flex-row justify-center gap-2 mb-6">
              <TextInput
                value={tempMinutes}
                onChangeText={setTempMinutes}
                keyboardType="numeric"
                maxLength={2}
                autoFocus
                className="bg-gray-100 text-black  p-4 text-center text-2xl w-24"
              />
              <Text className="text-white text-2xl font-bold">:</Text>
              <TextInput
                value={tempSeconds}
                onChangeText={setTempSeconds}
                keyboardType="numeric"
                maxLength={2}
                className="bg-gray-100 text-black  p-4 text-center text-2xl w-24"
              />
            </View>
            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={saveTimer}
                className="flex-1 bg-green-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTimerModalVisible(false)}
                className="flex-1 bg-gray-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Shot Clock Modal */}
      <Modal
        transparent
        visible={shotClockModalVisible}
        animationType="fade"
        onRequestClose={() => setShotClockModalVisible(false)}
      >
        <View className="flex-1 bg-gray-800/50 justify-center items-center">
          <View className="bg-black  p-6 w-80 border-neutral-400 shadow-xl">
            <Text className="text-white text-2xl font-semibold text-center mb-6">
              Set Shot Clock
            </Text>
            <TextInput
              value={tempShot}
              onChangeText={setTempShot}
              keyboardType="numeric"
              maxLength={2}
              autoFocus
              className="bg-gray-100 text-black  p-4 text-center text-2xl mb-6"
            />
            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={saveShotClock}
                className="flex-1 bg-green-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShotClockModalVisible(false)}
                className="flex-1 bg-gray-600  py-4 items-center"
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Layout */}
      {isLandscape ? (
        <View className="flex-1 flex-row gap-2">
          {renderScoreTimerLandscape()}
          {renderControlsLandscape()}
        </View>
      ) : (
        <View className="flex-1 justify-center gap-12">
          {renderScoreTimerPortrait()}
          {renderControlsPortrait()}
        </View>
      )}
    </View>
  );
}
