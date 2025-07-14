# Sensor Bubble - Live Data Dashboard

This project is a web-based dashboard designed to visualize real-time sensor data from an Arduino-powered "Sensor Bubble" attached to a vegetable carrier. It fetches data from a ThingSpeak channel and displays it on an interactive web page.

This dashboard is built with HTML, Tailwind CSS, and JavaScript, using Chart.js for data visualization and Leaflet.js for mapping.

## Live Demo

**(Link to your live GitHub Pages site will go here once deployed)**

## Features

* **Live Data Visualization**: Displays real-time data for Temperature, Humidity, and Gas levels on auto-updating charts.
* **GPS Tracking**: Shows the carrier's current location on an interactive map.
* **Historical Path**: Draws the recent travel history of the carrier on the map.
* **Date Range Filtering**: Allows users to select a specific start and end date/time to view historical data for that period.
* **Responsive Design**: The dashboard is fully responsive and works on desktops, tablets, and mobile devices.
* **Easy Configuration**: Requires only a ThingSpeak Channel ID and Read API Key to get started.

## How to Set Up and Deploy

To get this project running and publish it as a GitHub Page, follow these steps:

### 1. Prerequisites

* A GitHub account.
* An Arduino device sending data to a ThingSpeak channel. Your channel should be configured to receive:
    * `field1`: Temperature
    * `field2`: Humidity
    * `field3`: Longitude
    * `field4`: Latitude
    * `field8`: Gas Level

### 2. Get Your ThingSpeak Credentials

1.  Navigate to your channel on [ThingSpeak](https://thingspeak.com/).
2.  Go to the **"API Keys"** tab.
3.  Copy your **Channel ID**.
4.  Copy your **Read API Key**. It is recommended to use a Read API Key, not the Write API Key, for security.

### 3. Configure the Dashboard

1.  Open the `index.html` file in a text editor.
2.  Locate the "SENSOR DASHBOARD CONFIGURATION" section within the `<script>` tag.
3.  Replace the placeholder values for `THINGSPEAK_CHANNEL_ID` and `THINGSPEAK_READ_API_KEY` with your credentials.

    ```javascript
    // SENSOR DASHBOARD CONFIGURATION
    const THINGSPEAK_CHANNEL_ID = '2577520'; // <-- Replace with your Channel ID
    const THINGSPEAK_READ_API_KEY = '6KA9LPUYTB52DPCR'; // <-- Replace with your Read API Key
    ```

### 4. Deploy to GitHub Pages

1.  Create a new repository on GitHub.
2.  Upload the `index.html` file (and this `README.md` file) to your new repository.
3.  In the repository settings, go to the **"Pages"** section.
4.  Under "Build and deployment", select **"Deploy from a branch"** as the source.
5.  Choose the `main` (or `master`) branch and click **"Save"**.
6.  After a few minutes, GitHub will provide you with a public URL for your live dashboard. Add this link to the "Live Demo" section of this README.

## Project Structure

* `index.html`: The main file containing the dashboard's structure (HTML), styling (Tailwind CSS), and logic (JavaScript).
* `README.md`: This file, providing information about the project.

## Contributing

This is a collaborative project. Contributions are welcome! To contribute:

1.  **Fork the repository**: Create your own copy of the project.
2.  **Create a new branch**: Make your changes in a separate branch (e.g., `git checkout -b feature/add-new-chart`).
3.  **Commit your changes**: Add a clear message describing the changes you made.
4.  **Push to your branch**: Push your changes to your forked repository.
5.  **Create a Pull Request**: Open a pull request from your branch to the main project's `main` branch.

Please ensure that any new code is well-commented and follows the existing project structure.
