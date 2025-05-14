import { useState, useRef } from 'react';
import './App.css';
const uuid = require('uuid');

function App() {
  const [uploadResultMessage, setUploadResultMessage] = useState('Please capture an image to authenticate');
  const [visitorName, setVisitorName] = useState('placeholder.jpeg');
  const [isAuth, setAuth] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        console.error('Error accessing camera: ', err);
      });
  };

  const captureImage = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const visitorImageName = uuid.v4();
      setVisitorName(`${visitorImageName}.jpeg`);
      sendImageToAWS(blob, visitorImageName);
    }, 'image/jpeg');
  };

  const sendImageToAWS = (imageBlob, visitorImageName) => {
    fetch(`https://48cc83boci.execute-api.us-east-1.amazonaws.com/dev/pjt-visitor-image-storage/${visitorImageName}.jpeg`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: imageBlob,
    })
      .then(async () => {
        const response = await authenticate(visitorImageName);
        if (response.Message === 'Success') {
          setAuth(true);
          setUploadResultMessage(`Hello, ${response['firstName']} ${response['lastName']}, WELCOME.`);
        } else {
          setAuth(false);
          setUploadResultMessage(`User NOT Found`);
        }
      })
      .catch((error) => {
        setAuth(false);
        setUploadResultMessage('There is an error in the authentication process, try again later.');
        console.error(error);
      });
  };

  // Authenticate the image with AWS
  async function authenticate(visitorImageName) {
    const requestUrl = `https://48cc83boci.execute-api.us-east-1.amazonaws.com/dev/employee?${new URLSearchParams({
      objectKey: `${visitorImageName}.jpeg`,
    })}`;
    return await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => data)
      .catch((error) => console.error(error));
  }

  return (
    <div className="App">
      <h2>IMAGE AUTHENTICATION PORTAL</h2>
      <button onClick={startCamera}>Start Camera</button>
      <video ref={videoRef} autoPlay width={250} height={250} />
      <canvas ref={canvasRef} style={{ display: 'none' }} width={250} height={250} />
      <form onSubmit={captureImage}>
        <button type="submit">Capture & Authenticate</button>
      </form>
      <div className={isAuth ? 'success bold-welcome' : 'failure'}>{uploadResultMessage}</div>
    </div>
  );
}

export default App;