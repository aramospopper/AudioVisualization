import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

// BLE UUIDs
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

function App() {
	const [points, setPoints] = useState([]);
	const [isConnected, setIsConnected] = useState(false);
	const [status, setStatus] = useState("Disconnected");
  
	const connectBle = async () => {
	  try {
		setStatus("Scanning...");
		const device = await navigator.bluetooth.requestDevice({
		  filters: [{ services: [UART_SERVICE_UUID] }]
		});
  
		const server = await device.gatt.connect();
		const service = await server.getPrimaryService(UART_SERVICE_UUID);
		const characteristic = await service.getCharacteristic(UART_TX_CHAR_UUID);
  
		await characteristic.startNotifications();
		
		setIsConnected(true);
		setStatus(`Connected to ${device.name || "Sensor"}`);
  
		characteristic.addEventListener('characteristicvaluechanged', (event) => {
		  const rawValue = new TextDecoder().decode(event.target.value);
		  const [left, right] = rawValue.split(',').map(Number);
  
		  setPoints(prev => {
			const newPoints = [...prev, { 
			  time: new Date().toLocaleTimeString().split(' ')[0], 
			  left, 
			  right 
			}];
			return newPoints.slice(-30); // Show last 30 readings
		  });
		});
  
		device.addEventListener('gattserverdisconnected', () => {
		  setIsConnected(false);
		  setStatus("Disconnected");
		  setPoints([]);
		});
  
	  } catch (error) {
		console.error(error);
		setStatus("Error: " + error.message);
	  }
	};
  
	return (
	  <>
		{/* <div>
		  <a href="https://vite.dev" target="_blank">
			<img src={viteLogo} className="logo" alt="Vite logo" />
		  </a>
		  <a href="https://react.dev" target="_blank">
			<img src={reactLogo} className="logo react" alt="React logo" />
		  </a>
		</div> */}
		
		<h1>AudioVisor</h1>
		<p className="status-text">Status: <strong>{status}</strong></p>
  
		<div className="card">
		  <button 
			onClick={connectBle} 
			style={{ backgroundColor: isConnected ? '#4CAF50' : '#646cff' }}
		  >
			{isConnected ? "Connection Active" : "Connect via BLE"}
		  </button>
		</div>
  
		{isConnected && (
		  <div className="graph-container" style={{ width: '100%', height: '400px', marginTop: '30px' }}>
			<ResponsiveContainer width="100%" height="100%">
			  <LineChart data={points}>
				<CartesianGrid strokeDasharray="3 3" stroke="#333" />
				<XAxis dataKey="time" stroke="#ccc" />
				<YAxis 
				domain={[0, 500]} 
  				allowDataOverflow={true} 
  				stroke="#ccc" />
				<Tooltip contentStyle={{backgroundColor: '#222', border: '1px solid #555'}} />
				<Line 
				  type="monotone" 
				  dataKey="left" 
				  stroke="#646cff" 
				  strokeWidth={3}
				  dot={false} 
				  isAnimationActive={false} 
				/>
				<Line 
				  type="monotone" 
				  dataKey="right" 
				  stroke="#ff4646" 
				  strokeWidth={3}
				  dot={false} 
				  isAnimationActive={false} 
				/>
			  </LineChart>
			</ResponsiveContainer>
		  </div>
		)}
  
		<p className="read-the-docs">
		  Use the button above to pair with your ItsyBitsy microcontroller.
		</p>
	  </>
	)
}

export default App
