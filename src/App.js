import { useState, useRef } from 'react';
import './App.css';
const uuid = require('uuid');

function App() {
  const [uploadResultMessage, setUploadResultMessage] = useState('Please capture an image to authenticate');
  const [visitorName, setVisitorName] = useState('placeholder.jpeg');
  const [isAuth, setAuth] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setCapturedImage(null); // Clear previous image
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

    // Get Data URL for preview
    const imageUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageUrl);

    // Stop video stream
    const stream = videoRef.current.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }

    // Convert canvas to Blob and upload
    canvas.toBlob((blob) => {
      const visitorImageName = uuid.v4();
      setVisitorName(`${visitorImageName}.jpeg`);
      sendImageToAWS(blob, visitorImageName);
    }, 'image/jpeg');
  };

  const sendImageToAWS = (imageBlob, visitorImageName) => {
    setIsAuthenticating(true);

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
          setUploadResultMessage(`Hello, ${response['firstName']} ${response['lastName']}, Welcome.`);
        } else {
          setAuth(false);
          setUploadResultMessage(`User NOT Found`);
        }
      })
      .catch((error) => {
        setAuth(false);
        setUploadResultMessage('There is an error in the authentication process, try again later.');
        console.error(error);
      })
      .finally(() => {
        setIsAuthenticating(false);
      });
  };

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
      .catch((error) => console.error(error));
  }

  const resetState = () => {
    window.location.reload();
  };

  return (
    <div className="App">
      <div className="card">
        <h2>IMAGE AUTHENTICATION PORTAL</h2>
        <div className='button-group'>
          <button onClick={startCamera}>Start Camera</button>
        </div>
        <div className="preview-box">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" />
          ) : (
            <video ref={videoRef} autoPlay />
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} width={250} height={250} />

        <div className="button-group">
          <form onSubmit={captureImage}>
            <button type="submit">Capture & Authenticate</button>
          </form>
          <button className="reset-btn" onClick={resetState}>Reset</button>
        </div>

        <div
          className={
            isAuthenticating
              ? 'authenticating'
              : isAuth
              ? 'success bold-welcome'
              : 'failure'
          }
        >
          {isAuthenticating ? 'Image is Authenticating...' : uploadResultMessage}
        </div>
      </div>
    </div>
  );
}

export default App;
