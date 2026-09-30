# POLAR-EMS ❄️⚡

### Energy Management & Decision Support System for Polar Research Stations

POLAR-EMS is an energy management and decision-support platform designed for isolated polar research stations.

It brings together weather conditions, energy consumption, renewable generation, generators, battery storage, critical loads, alerts, and scenario-based energy analysis into a centralized station-level dashboard.

> Developed as a solution for Smart India Hackathon 2026.

---

## 🧊 Problem Statement

Polar research stations operate in remote and harsh environments where maintaining a reliable energy supply is essential.

Energy demand can vary with weather conditions and station activities, while renewable generation from sources such as solar and wind is variable. Diesel generators and battery storage therefore need to be monitored alongside critical station loads.

A centralized energy management system can help operators understand the current energy situation, monitor important assets, identify risks, and evaluate different energy scenarios.

---

## 💡 Our Solution

POLAR-EMS provides a centralized platform for monitoring and analyzing the energy ecosystem of a polar research station.

The system integrates:

* Weather data
* Energy consumption
* Solar and wind generation
* Diesel/CHP generators
* Battery storage and readings
* Critical and flexible loads
* Energy alerts
* Renewable penetration analysis
* Energy balance analysis
* Scenario-based simulation
* Station-level monitoring

The platform is designed to support operators by presenting these different energy components together in an interactive dashboard.

---

## 🎯 Key Features

### 🌦️ Weather Monitoring

Monitor station weather conditions including:

* Temperature
* Wind speed
* Wind direction
* Atmospheric pressure
* Humidity
* Solar radiation data where available

### ⚡ Energy Monitoring

Track station energy demand and its major components, including:

* Heating
* Water systems
* Communication
* Laboratory
* Refrigeration
* Flexible loads

### 🌱 Renewable Generation

Monitor renewable energy contribution from:

* Solar generation
* Wind generation
* Total renewable generation

The dashboard also provides renewable penetration and energy-balance insights.

### 🔋 Battery Monitoring

Monitor battery systems and their readings as part of the station energy ecosystem.

### 🔥 Generator Monitoring

Track generator availability and generation information alongside renewable sources and battery storage.

### 🚨 Critical Loads & Alerts

Monitor critical station loads and energy-related alerts to help operators identify important operating conditions.

### 🧪 Scenario & Simulation Analysis

POLAR-EMS includes scenario-based analysis that allows different energy conditions to be represented and compared.

Simulation results can be used to understand how changes in energy conditions affect the station system.

### 🛰️ Multi-Station Architecture

The system is designed around individual stations, allowing different polar research stations to be monitored through the same platform.

---

## 🖥️ Dashboard

The POLAR-EMS interface provides a control-room-style view of a station's energy ecosystem.

The dashboard brings together:

* Station overview
* Weather conditions
* Energy consumption
* Renewable generation
* Battery status
* Generator status
* Critical loads
* Active alerts
* Energy insights
* Scenario and simulation results

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │    Polar Research       │
                    │        Station          │
                    │                         │
                    │ Weather / Energy        │
                    │ Solar / Wind            │
                    │ Battery / Generator     │
                    │ Critical Loads          │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Data Layer         │
                    │                         │
                    │ PostgreSQL + Neon       │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Backend API        │
                    │                         │
                    │ Node.js + Express       │
                    │ REST APIs + Prisma      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     Analysis Layer      │
                    │                         │
                    │ Energy Balance          │
                    │ Renewable Penetration   │
                    │ Scenario Analysis       │
                    │ Simulation Results       │
                    └────────────┬────────────┘
                                 │
                                 ▼
              ┌────────────────────────────────────┐
              │            POLAR-EMS UI             │
              │                                    │
              │ Dashboard | Weather | Energy       │
              │ Assets | Alerts | Simulation      │
              │ Scenario Analysis                  │
              └────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Data Visualization

### Backend

* Node.js
* Express.js
* REST APIs

### Database

* PostgreSQL
* Prisma ORM
* Neon

### Development

* Git
* GitHub
* VS Code

---

## 📊 Data

POLAR-EMS works with a combination of historical, modeled, scenario, and demonstration data depending on the system component.

The project includes station weather information and energy-system data used for monitoring, analysis, and simulation.

The platform is structured so that additional station datasets and energy sources can be integrated in the future.

---

## 🗺️ Current Stations

The current system includes station-level support for:

* **Maitri Station**
* **Bharati Station**

The architecture is designed to support additional remote research stations.

---

## 🚀 Project Structure

```text
POLAR-EMS/
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── ...
│
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── scripts/
│   └── ...
│
└── README.md
```

---

## 🔮 Future Scope

The current platform provides the foundation for further development of intelligent energy-management capabilities.

Possible future extensions include:

* Energy demand forecasting
* Renewable generation forecasting
* Battery dispatch optimization
* Generator scheduling
* Fuel-consumption optimization
* Advanced anomaly detection
* Machine-learning-based prediction
* Integration with additional real-time station data

These capabilities can be developed on top of the existing energy-management architecture.

---

## 🎥 Demo

**Watch the project demonstration:**
(https://youtu.be/PAmuiOzXiH0)(#)

**View the source code:**
https://github.com/KaverishaBhakat/POLAR-EMS(#)

---

## 👩‍💻 Developed For

**Smart India Hackathon 2026**

POLAR-EMS explores how a centralized energy-management and decision-support platform can help monitor and analyze energy systems in isolated research environments.

---
