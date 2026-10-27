# Student Attendance Management System Using DevOps Tools

## Project Overview
The Student Attendance Management System is a web-based application developed to manage student details and record attendance for seven periods each day. It also provides monthly attendance reports and CSV export functionality.

## Features
- Add and manage student details
- Record daily attendance for seven periods
- View monthly attendance reports
- Export attendance reports as CSV files
- Run the application using Docker
- Deploy the application on Kubernetes
- Build and deploy using Jenkins CI/CD Pipeline

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Containerization:** Docker
- **Orchestration:** Kubernetes
- **CI/CD:** Jenkins
- **Version Control:** Git and GitHub

## How to Run Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/harikachiluveru5/Student-Attendance-Management-System.git
   ```
2. Open the project folder:
   ```bash
   cd Student-Attendance-Management-System
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` in your browser.

## Docker
Build the Docker image:
```bash
docker build -t student-attendance:1.0 .
```

Run the container:
```bash
docker run -p 3001:3000 student-attendance:1.0
```

Open `http://localhost:3001`.

## Kubernetes
The project includes Kubernetes deployment and service configuration files:
- `deployment.yaml`
- `service.yaml`

The application can be accessed at `http://localhost:30081` when the Kubernetes deployment and NodePort service are running.

## Jenkins CI/CD
The Jenkins pipeline checks out the GitHub repository, builds the Docker image, checks Kubernetes connectivity, and applies the Kubernetes deployment and service configurations.

## Repository
[Student Attendance Management System](https://github.com/harikachiluveru5/Student-Attendance-Management-System)
