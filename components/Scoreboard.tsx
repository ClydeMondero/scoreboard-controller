import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { PeripheralServices } from "@/types/bluetooth";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import BleManager from "react-native-ble-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface GameData {
  homeScore: number;
  awayScore: number;
  remainingSeconds: number;
  shotClock: number;
  selectedPeriod: number;
  possession: "HOME" | "AWAY" | "";
}

interface ScoreboardProps {
  bleService: PeripheralServices | undefined;
  onRead: () => Promise<number[] | undefined>;
  onWrite: () => Promise<void>;
  onDisconnect: (peripheralId: string) => Promise<void>;
  gameData: GameData;
  setGameData: React.Dispatch<React.SetStateAction<GameData>>;
}

export default function Scoreboard({
  bleService,
  gameData,
  setGameData,
}: ScoreboardProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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
  const sessionId = useRef<string>(`session_${Date.now()}`);

  useEffect(() => {
    const storeData = async (value: GameData) => {
      try {
        const jsonValue = await AsyncStorage.getItem("sessions");
        let existingSessions: any[] = [];

        if (jsonValue) {
          const parsed = JSON.parse(jsonValue);
          if (Array.isArray(parsed)) {
            existingSessions = parsed;
          }
        }

        const newSession = {
          id: sessionId.current,
          ...value,
        };

        // Check if session already exists
        const sessionIndex = existingSessions.findIndex(
          (session) => session.id === sessionId.current
        );

        if (sessionIndex !== -1) {
          // Update the existing session
          existingSessions[sessionIndex] = newSession;
        } else {
          // Add new session
          existingSessions.push(newSession);
        }

        // Keep only the last 5 sessions
        const limitedSessions = existingSessions.slice(-5);

        await AsyncStorage.setItem("sessions", JSON.stringify(limitedSessions));
      } catch (e) {
        console.error("Error storing data:", e);
      }
    };

    if (gameData) {
      storeData(gameData);
    }
  }, [gameData]);

  useEffect(() => {
    let ticker: NodeJS.Timeout;
    if (isTimeRunning) {
      ticker = setInterval(() => {
        setGameData((prev) => {
          const remainingSeconds = Math.max(prev.remainingSeconds - 1, 0);
          const shotClock = Math.max(prev.shotClock - 1, 0);

          // send updated values
          sendCommand(`TIME:${remainingSeconds}`);
          sendCommand(`SETSHOT:${shotClock}`);

          return {
            ...prev,
            remainingSeconds,
            shotClock,
          };
        });
      }, 1000);
    }
    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [isTimeRunning]);

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

  const handleReset24 = () => {
    setGameData((d) => ({ ...d, shotClock: 24 }));
    sendCommand("SETSHOT:24");
    handlePause();
  };

  const handleReset14 = () => {
    setGameData((d) => ({ ...d, shotClock: 14 }));
    sendCommand("SETSHOT:14");
    handlePause();
  };

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
      <View className="flex-row items-center justify-around w-full mb-6">
        {/* Home */}
        <TouchableOpacity
          onPress={() => openEditScore("HOME")}
          className="items-center"
        >
          <Text className="text-gray-300 text-sm font-medium mb-2">HOME</Text>
          <Text
            className="text-yellow-400 text-6xl "
            style={{ fontFamily: "digital-7" }}
          >
            {gameData.homeScore}
          </Text>
        </TouchableOpacity>

        {/* Timer */}
        <View className="items-center">
          <TouchableOpacity onPress={openEditTimer}>
            <Text
              className="text-white text-7xl font-mono"
              style={{ fontFamily: "digital-7" }}
            >
              {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
                2,
                "0"
              )}
              :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditShotClock}>
            <Text
              className="text-red-600 text-5xl mt-2"
              style={{ fontFamily: "digital-7" }}
            >
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
          <Text
            className="text-green-500 text-6xl "
            style={{ fontFamily: "digital-7" }}
          >
            {gameData.awayScore}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row justify-between gap-6">
        {/* <TouchableOpacity
          className="bg-yellow-400 p-4  shadow-md mt-4"
          onPress={setPossessionHome}
        >
          <AntDesign name="caretleft" size={28} color="white" />
        </TouchableOpacity> */}

        {/* Horn Button */}
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
        {/* <TouchableOpacity
          onPress={setPossessionAway}
          className="bg-green-500 p-4  shadow-md mt-4"
        >
          <AntDesign name="caretright" size={28} color="white" />
        </TouchableOpacity> */}
      </View>
    </View>
  );

  // const renderScoreTimerLandscape = () => (
  //   <View className="flex-1 justify-center items-center">
  //     {/* Possession */}
  //     <View className="items-center mb-6">
  //       <Text className="text-gray-400 uppercase text-sm mb-2">
  //         Ball Possession
  //       </Text>
  //       {gameData.possession === "HOME" ? (
  //         <AntDesign name="caretleft" size={28} color="yellow" />
  //       ) : gameData.possession === "AWAY" ? (
  //         <AntDesign name="caretright" size={28} color="green" />
  //       ) : (
  //         <View style={{ height: 28 }} />
  //       )}
  //     </View>

  //     {/* Scores and Timer */}
  //     <View className="flex-row items-center justify-between w-full px-10 mb-6">
  //       {/* Home */}
  //       <TouchableOpacity
  //         onPress={() => openEditScore("HOME")}
  //         className="items-center"
  //       >
  //         <Text className="text-gray-300 text-sm font-medium mb-2">HOME</Text>
  //         <Text
  //           className="text-yellow-400 text-6xl "
  //           style={{ fontFamily: "digital-7" }}
  //         >
  //           {gameData.homeScore}
  //         </Text>
  //       </TouchableOpacity>

  //       {/* Timer */}
  //       <View className="items-center">
  //         <TouchableOpacity onPress={openEditTimer}>
  //           <Text
  //             className="text-white text-3xl font-mono"
  //             style={{ fontFamily: "digital-7" }}
  //           >
  //             {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
  //               2,
  //               "0"
  //             )}
  //             :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
  //           </Text>
  //         </TouchableOpacity>
  //         <TouchableOpacity onPress={openEditShotClock}>
  //           <Text
  //             className="text-red-600 text-5xl mt-2"
  //             style={{ fontFamily: "digital-7" }}
  //           >
  //             {gameData.shotClock}
  //           </Text>
  //         </TouchableOpacity>

  //         <TouchableOpacity onPress={openEditPeriod}>
  //           <Text className="text-gray-400 uppercase text-xs tracking-widest mt-2">
  //             Period {gameData.selectedPeriod}
  //           </Text>
  //         </TouchableOpacity>
  //       </View>

  //       {/* Away */}
  //       <TouchableOpacity
  //         onPress={() => openEditScore("AWAY")}
  //         className="items-center"
  //       >
  //         <Text className="text-gray-300 text-sm font-medium mb-2">AWAY</Text>
  //         <Text
  //           className="text-green-500 text-6xl"
  //           style={{ fontFamily: "digital-7" }}
  //         >
  //           {gameData.awayScore}
  //         </Text>
  //       </TouchableOpacity>
  //     </View>

  //     <View className="flex-row justify-between gap-6">
  //       {/* Horn Button */}
  //       <TouchableOpacity
  //         className="bg-yellow-400 p-4  shadow-md mt-4"
  //         onPress={setPossessionHome}
  //       >
  //         <AntDesign name="caretleft" size={28} color="white" />
  //       </TouchableOpacity>
  //       <TouchableOpacity
  //         onPressIn={() => sendCommand("PRESS")}
  //         onPressOut={() => sendCommand("RELEASE")}
  //         className="bg-blue-600 p-4  shadow-md mt-4"
  //       >
  //         <MaterialCommunityIcons
  //           name="bullhorn-variant"
  //           size={28}
  //           color="#FFF"
  //         />
  //       </TouchableOpacity>
  //       <TouchableOpacity
  //         onPress={setPossessionAway}
  //         className="bg-green-500 p-4  shadow-md mt-4"
  //       >
  //         <AntDesign name="caretright" size={28} color="white" />
  //       </TouchableOpacity>
  //     </View>
  //   </View>
  // );

  // const renderControlsLandscape = () => (
  //   <View className="gap-6 px-4 py-6 flex-1 justify-evenly">
  //     {/* Start & Reset | Pause & Reset */}
  //     <View className="flex-1 flex-row justify-evenly gap-6">
  //       {/* Start & Pause Column */}
  //       <TouchableOpacity
  //         onPress={isTimeRunning ? handlePause : handleStart}
  //         className={`justify-center lp-4  w-28 ${
  //           isTimeRunning ? "bg-blue-500" : "bg-green-500"
  //         }`}
  //       >
  //         <Text className="text-white text-center text-lg font-bold">
  //           {isTimeRunning ? "PAUSE" : "START"}
  //         </Text>
  //       </TouchableOpacity>

  //       {/* Reset Buttons Column */}
  //       <View className="flex-1 g-red-200 gap-4">
  //         <TouchableOpacity
  //           onPress={handleReset24}
  //           className="flex-1 w-full justify-center bg-red-800 p-4  "
  //         >
  //           <Text className="text-white text-center text-base font-bold">
  //             RESET 24
  //           </Text>
  //         </TouchableOpacity>
  //         <TouchableOpacity
  //           onPress={handleReset14}
  //           className="flex-1 justify-center bg-red-600 p-4  w-full"
  //         >
  //           <Text className="text-white text-center text-base font-bold">
  //             RESET 14
  //           </Text>
  //         </TouchableOpacity>
  //       </View>
  //       <View className="gap-4 flex-1 justify-center">
  //         <TouchableOpacity
  //           onPress={handleResetAll}
  //           className="flex-1 justify-center items-center-center bg-red-400 p-4  w-28"
  //         >
  //           <Text className="text-white text-center text-base font-bold">
  //             RESET All
  //           </Text>
  //         </TouchableOpacity>
  //       </View>
  //     </View>

  //     {/* Score Increments */}
  //     <View className="flex-row gap-6">
  //       {/* Home Controls */}
  //       <View className="flex-1 gap-2">
  //         <View className="flex-row flex-wrap justify-center gap-2">
  //           {[1, 2, 3].map((n) => (
  //             <TouchableOpacity
  //               key={`home+${n}`}
  //               onPress={() => incHome(n)}
  //               className="bg-white w-16 h-16  justify-center items-center"
  //             >
  //               <Text className="text-yellow-500 font-bold text-lg">+{n}</Text>
  //             </TouchableOpacity>
  //           ))}
  //           <TouchableOpacity
  //             onPress={decHome}
  //             className="bg-white w-16 h-16  justify-center items-center"
  //           >
  //             <Text className="text-yellow-500 font-bold text-lg">-1</Text>
  //           </TouchableOpacity>
  //         </View>
  //       </View>

  //       {/* Away Controls */}
  //       <View className="flex-1 gap-2">
  //         <View className="flex-1 flex-row flex-wrap justify-center gap-2">
  //           {[1, 2, 3].map((n) => (
  //             <TouchableOpacity
  //               key={`away+${n}`}
  //               onPress={() => incAway(n)}
  //               className="bg-white w-16 h-16  justify-center items-center"
  //             >
  //               <Text className="text-green-500 font-bold text-lg">+{n}</Text>
  //             </TouchableOpacity>
  //           ))}
  //           <TouchableOpacity
  //             onPress={decAway}
  //             className="bg-white w-16 h-16  justify-center items-center"
  //           >
  //             <Text className="text-green-500 font-bold text-lg">-1</Text>
  //           </TouchableOpacity>
  //         </View>
  //       </View>
  //     </View>
  //   </View>
  // );

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
          onPress={handleReset14}
          className="flex-1 bg-red-600 p-4 "
        >
          <Text className="text-white text-center font-bold text-lg">
            RESET 14
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReset24}
          className="flex-1 bg-red-600 p-4 "
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
      <View className="flex-row gap-4">
        <TouchableOpacity
          onPress={setPossessionHome}
          className={`flex-1 p-4 bg-yellow-400`}
        >
          <Text className="text-white text-center text-xl font-bold">HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={setPossessionAway}
          className={`flex-1 p-4 bg-green-500
          `}
        >
          <Text className="text-white text-center text-xl font-bold">AWAY</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row ">
        <TouchableOpacity
          onPress={handleResetAll}
          className="flex-1 bg-red-600 p-4 "
        >
          <Text className="text-white text-center font-bold text-lg">
            RESET All
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLandscape = () => (
    <View className="flex-1 flex-row bg-black justify-evenly items-center">
      {/* Home Score Controls */}
      <View className="justify-evenly h-40 gap-1">
        {[1, 2, 3].map((pt) => (
          <TouchableOpacity
            key={pt}
            className="bg-white px-6 py-2"
            onPress={() => incHome(pt)}
          >
            <Text className="text-yellow-500">+{pt}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity className="bg-white px-6 py-2" onPress={decHome}>
          <Text className="text-yellow-500">-1</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center ">
        <View className="flex-row justify-evenly items-center w-full">
          <TouchableOpacity onPress={setPossessionHome}>
            <AntDesign
              name="caretleft"
              size={60}
              color={gameData.possession === "HOME" ? "yellow" : "white"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditTimer}>
            <Text
              className="text-9xl text-white"
              style={{ fontFamily: "digital-7" }}
            >
              {String(Math.floor(gameData.remainingSeconds / 60)).padStart(
                2,
                "0"
              )}
              :{String(gameData.remainingSeconds % 60).padStart(2, "0")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={setPossessionAway}>
            <AntDesign
              name="caretright"
              size={60}
              color={gameData.possession === "AWAY" ? "green" : "white"}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={openEditPeriod}>
          <Text className="text-center text-white text-lg mt-2">
            PERIOD {gameData.selectedPeriod}
          </Text>
        </TouchableOpacity>
        <View className="flex-1 flex-row  justify-evenly items-center w-full">
          <View className="items-center">
            <TouchableOpacity onPress={() => openEditScore("HOME")}>
              <Text
                className="text-yellow-500 text-8xl mx-2"
                style={{ fontFamily: "digital-7" }}
              >
                {gameData.homeScore}
              </Text>
            </TouchableOpacity>
            <View className="bg-yellow-500 p-4">
              <Text className="text-white font-bold">HOME</Text>
            </View>
          </View>
          <View className="items-center mx-2">
            <TouchableOpacity onPress={openEditShotClock}>
              <Text
                className="text-red-500 text-6xl"
                style={{ fontFamily: "digital-7" }}
              >
                {gameData.shotClock}
              </Text>
            </TouchableOpacity>
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                className="bg-red-700 p-3"
                onPress={handleReset14}
              >
                <Text className="text-white">14</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-700 p-3"
                onPress={handleResetAll}
              >
                <Text className="text-white">RESET</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-700 p-3"
                onPress={handleReset24}
              >
                <Text className="text-white">24</Text>
              </TouchableOpacity>
            </View>
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
          </View>
          <View className="items-center">
            <TouchableOpacity onPress={() => openEditScore("AWAY")}>
              <Text
                className="text-green-500 text-8xl mx-2"
                style={{ fontFamily: "digital-7" }}
              >
                {gameData.awayScore}
              </Text>
            </TouchableOpacity>
            <View className="bg-green-500 p-4">
              <Text className="text-white font-bold">AWAY</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="justify-evenly h-40 gap-1">
        {[1, 2, 3].map((pt) => (
          <TouchableOpacity
            key={pt}
            className="bg-white px-6 py-2"
            onPress={() => incAway(pt)}
          >
            <Text className="text-green-500">+{pt}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity className="bg-white px-6 py-2" onPress={decAway}>
          <Text className="text-green-500">-1</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#09090B] ">
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
              onChangeText={(text) => {
                // Ensure the text is numeric and within the valid range (0-24 seconds)
                if (!text) setTempShot(text);
                if (parseInt(text) >= 1 && parseInt(text) <= 24) {
                  setTempShot(text);
                }
              }}
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
        <View className="flex-1">{renderLandscape()}</View>
      ) : (
        <View className="flex-1 justify-center gap-12 p-6">
          {renderScoreTimerPortrait()}
          {renderControlsPortrait()}
        </View>
      )}
    </View>
  );
}
