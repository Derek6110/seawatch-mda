# SeaWatch Shore-Station Forwarder

Runs on the PC at the AIS receiver site (Tema). Reads raw NMEA from the
receiver and forwards it securely to the SeaWatch server, where it appears as
the **shore** provider on the live picture.

## One-time setup (Windows)

1. Install Node.js LTS from https://nodejs.org (18 or newer).
2. Copy this `forwarder/` folder onto the site PC.
3. Open a terminal in the folder and run:
   ```
   npm install
   ```
4. Plug in the AIS receiver via USB and find its COM port:
   **Device Manager → Ports (COM & LPT)** — e.g. `COM3`
   (it appears as "USB Serial Port" or the receiver vendor's name).

## Run

```
node forwarder.js --port COM3 --key YOUR_INGEST_KEY
```

- `YOUR_INGEST_KEY` must match the `INGEST_KEY` environment variable set on the
  SeaWatch server (Render dashboard). Treat it like a password.
- AIS receivers output at **38400 baud** (the default). If yours is set to
  4800, add `--baud 4800`.
- If the receiver's vendor software rebroadcasts NMEA over the network instead
  (e.g. AIS Dispatcher on UDP 10110), skip the COM port and use:
  ```
  node forwarder.js --udp 10110 --key YOUR_INGEST_KEY
  ```

The forwarder prints a status line every minute (lines sent, buffer size, and
how many shore-station vessels the server currently tracks). It batches lines
every 2 seconds, buffers during internet outages, and reconnects the serial
port automatically if the receiver is unplugged/replugged.

Note: the server only ingests while its data source is in **Live** or
**Hybrid** mode. In Simulation mode the forwarder stands by automatically.

## Keep it running (optional)

To auto-start on boot, create a Scheduled Task that runs the command above
"At log on", or use `nssm` to install it as a Windows service.
