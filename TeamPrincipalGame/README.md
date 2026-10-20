# Team Principal: an F1-style management game for Roblox

You run a Formula 1-style team. Hire drivers, a pit crew and strategists, develop
your car, then run every race weekend: three practice sessions, knockout
qualifying (Q1, Q2, Q3) and a live 3D race with changing weather. Call pit
stops, choose tyres and take the wheel yourself in the big moments. Seasons
have 18 rounds and go on forever, and the long-term goal is to beat real F1
records.

Everything is made from scripts: the 18 circuits, the cars, the menus and the
podium. You only paste 22 scripts into Roblox Studio.

`FULL_GAME.md` contains this guide plus every script in full, in the order
below, if you prefer copying from one page.

---

## Setup guide

### Easiest way: one command (also used to update the game)

1. In Studio, open the Command Bar (View or Window menu > Command Bar).
2. Copy everything in `INSTALL_COMMAND.lua`, paste it into the Command Bar and press Run.
3. The Output window should end with "22 of 22 scripts installed". If you see
   "FAILED", turn on Home > Game Settings > Security > Allow HTTP Requests and run it again.

Running the same command again later replaces every script with the newest
version. If you just got told about an update, wait about 5 minutes before
running it, so GitHub serves the new files.

The steps below do the same thing by hand.

### One-time Studio settings

1. Open Roblox Studio and create a new place from the **Baseplate** template.
2. Publish it: **File > Publish to Roblox**. Saving only works in a published place.
3. Go to **Home > Game Settings > Security** and turn on
   **Enable Studio Access to API Services**. Click **Save**.
   Without this the game still works, but your career is not saved between tests.

### Make the folders

In the **Explorer** panel (View > Explorer if you can't see it):

1. Right-click **ReplicatedStorage** > Insert Object > **Folder**. Rename it `Shared`.
2. Right-click **ReplicatedStorage** > Insert Object > **Folder**. Rename it `ClientModules`.
3. Right-click **ServerScriptService** > Insert Object > **Folder**. Rename it `ServerModules`.

### Add the scripts

For every file in the table below:

1. Right-click the location shown > **Insert Object** > the script type shown
   (ModuleScript, Script or LocalScript).
2. Rename it to the exact file name (capital letters matter, no `.lua`).
3. Open it, delete the text that is already there (for example
   `print("Hello world!")` or `local module = {}`), and paste the whole file.

| # | File name | Script type | Location in Studio |
|---|---|---|---|
| 1 | Config | ModuleScript | ReplicatedStorage > Shared |
| 2 | Tracks | ModuleScript | ReplicatedStorage > Shared |
| 3 | TrackPath | ModuleScript | ReplicatedStorage > Shared |
| 4 | DataManager | ModuleScript | ServerScriptService > ServerModules |
| 5 | TeamManager | ModuleScript | ServerScriptService > ServerModules |
| 6 | Weather | ModuleScript | ServerScriptService > ServerModules |
| 7 | TyreModel | ModuleScript | ServerScriptService > ServerModules |
| 8 | Radio | ModuleScript | ServerScriptService > ServerModules |
| 9 | RaceSim | ModuleScript | ServerScriptService > ServerModules |
| 10 | Objectives | ModuleScript | ServerScriptService > ServerModules |
| 11 | Records | ModuleScript | ServerScriptService > ServerModules |
| 12 | WeekendManager | ModuleScript | ServerScriptService > ServerModules |
| 13 | GameServer | Script | ServerScriptService |
| 14 | UIKit | ModuleScript | ReplicatedStorage > ClientModules |
| 15 | TrackBuilder | ModuleScript | ReplicatedStorage > ClientModules |
| 16 | RaceViewer | ModuleScript | ReplicatedStorage > ClientModules |
| 17 | DriveController | ModuleScript | ReplicatedStorage > ClientModules |
| 18 | HubPanels | ModuleScript | ReplicatedStorage > ClientModules |
| 19 | HubUI | ModuleScript | ReplicatedStorage > ClientModules |
| 20 | PodiumScene | ModuleScript | ReplicatedStorage > ClientModules |
| 21 | RaceUI | ModuleScript | ReplicatedStorage > ClientModules |
| 22 | ClientMain | LocalScript | StarterPlayer > StarterPlayerScripts |

The files in this folder are laid out the same way:
`ReplicatedStorage/Shared`, `ReplicatedStorage/ClientModules`,
`ServerScriptService/ServerModules`, `ServerScriptService/GameServer.lua` and
`StarterPlayerScripts/ClientMain.lua`.

When you are done, your Explorer should look like this:

```
ReplicatedStorage
  ClientModules   (Folder: UIKit, TrackBuilder, RaceViewer, DriveController,
                   HubPanels, HubUI, PodiumScene, RaceUI)
  Shared          (Folder: Config, Tracks, TrackPath)
ServerScriptService
  GameServer      (Script)
  ServerModules   (Folder: DataManager, TeamManager, Weather, TyreModel, Radio,
                   RaceSim, Objectives, Records, WeekendManager)
StarterPlayer
  StarterPlayerScripts
    ClientMain    (LocalScript)
```

Press **Play**. A "Remotes" folder appears in ReplicatedStorage by itself while
the game runs; you don't need to make it.

### Before you publish the game for others

The historical record targets are in **Config**, near the bottom, under
"HISTORICAL RECORD TARGETS". They are real F1 records as of the end of the
2025 season. Please check them against an up-to-date source and edit them if
needed.

---

## How to play

1. **Create your team.** Pick a name and colour. You start with $75M.
2. **Build the team.** Use the **Market** tab to sign two race drivers, a
   reserve, a pit crew and one or two strategists, or press **Quick Setup**.
   Driver stats: pace, consistency, wet weather, overtaking and tyre care.
   Pit crews have speed and reliability; strategists have call quality and
   planning. Hiring fees are paid now, salaries after every race.
3. **Develop the car** in the **Car** tab with money or upgrade points.
   Aerodynamics matters most on twisty tracks, the power unit on fast ones.
4. **Race weekend** (Weekend tab):
   * **FP1-FP3**: pick a programme (setup work, long runs or qualifying runs).
     Each makes you a little faster or easier on tyres this weekend.
   * **Q1 and Q2** knock out the slowest five each. In **Q3** you can simulate
     it or **drive the flying lap yourself**. Three track-limits warnings
     delete your lap, and your driver's banker lap still counts.
   * **Race**: choose starting tyres and press START. Use 4x, 8x or 16x speed.
     Your strategist pits automatically (AUTO), or switch to MANUAL and press
     **BOX** with the tyre you want. Soft, Medium and Hard are for dry tracks,
     Intermediate for damp and Wet for heavy rain. The wrong tyre costs
     seconds every lap. In a dry race each car must use two dry compounds or
     get a 10-second penalty.
   * **Take the wheel**: late in the race, when your car is in a close battle
     (and in the last four laps), the purple button lights up. Drive with
     W/S/A/D or the arrow keys (gamepad: triggers and left stick, phones:
     on-screen buttons). B toggles the braking assist. Press **H** (or the
     button) to hand back.
5. After the race you get prize and sponsor money. If one of your drivers
   finishes in the top three, you go to the **podium**.
6. **Objectives** give money and upgrade points. Daily ones reset at
   midnight UTC and weekly ones on Monday 00:00 UTC. Claim rewards in the
   Objectives tab.
7. **Records** shows your career against real F1 records. Beat one and the
   game celebrates.
8. After round 18 the championships are decided, end-of-season prize money is
   paid and a new season starts. Your team, budget and staff carry over.

---

## Troubleshooting

**A red bar says "Waiting for the server..."**
GameServer is missing, misnamed, or in the wrong place. It must be a **Script**
(not a LocalScript) directly inside **ServerScriptService**.

**The Output window says "Infinite yield possible on ... WaitForChild("Something")"**
A script or folder has the wrong name or is in the wrong folder. Names must
match the table exactly, including capital letters. For example
`ReplicatedStorage.Shared.Config` must be a ModuleScript named `Config` inside
a Folder named `Shared`.

**The top bar says "Saving off" or "Saving is not available here"**
Publish the place (File > Publish to Roblox) and turn on **Enable Studio Access
to API Services** (Home > Game Settings > Security), then press Play again.
The game still runs without saving, it just starts fresh each time.

**Saving says "Could not load your save, so saving is off for this visit"**
Roblox's DataStores had a problem when you joined. Saving is switched off on
purpose so your old save isn't overwritten by a new career. Rejoin later.

**Nothing happens when I click, or the screen stays empty**
Open View > Output and look for red errors. Check that ClientMain is a
**LocalScript** inside **StarterPlayer > StarterPlayerScripts**, not in
StarterGui or StarterCharacterScripts. Also check that no file was only
partly pasted: each one must end with a line like `return Config` or, for
ClientMain and GameServer, the last `end)` of the file.

**"Requested module experienced an error while loading"**
One of the ModuleScripts has a copy-paste mistake. The line number in the
error tells you which file. Paste that file again in full.

**The circuit takes a moment to appear**
The track is built from parts when a new round starts. It takes a few
seconds, and a message says "Building the circuit...".

**The game is slow on my computer**
Lower the graphics quality in Studio (File > Studio Settings > Rendering) or in
the Roblox menu while playing. Use the Overhead camera during races.

**A red box says "Something went wrong"**
Take a screenshot of the box and send it to whoever is helping you. It shows the
exact error from the game, so it can be fixed quickly.

**The menus look too small or too big**
The interface scales itself to fit the game window. Make the Studio game view
bigger (close side panels such as the Assistant) for larger text.

**I want to start my career again**
Change `Config.DataStoreName` (top of Config) to a new name, for example
`"TeamPrincipalCareer_v2"`.

**My avatar is standing on the baseplate below the track**
That is normal. The game is played through the menus and cameras, so the
avatar is frozen in place.

---

## Credits and notes

* Circuit, team and driver names are made up. The circuit shapes follow real
  circuits, using centreline data from the MIT-licensed
  [f1-circuits](https://github.com/bacinger/f1-circuits) dataset by Tomislav
  Bacinger (credit is kept in the Tracks script).
* Races are about a third of real race distance so a race takes 5-10 minutes.
  Tyre wear and fuel use are scaled to match.
* Each player who joins gets their own independent career.
