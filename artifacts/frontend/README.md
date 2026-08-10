# InsureMithra Frontend

A beautiful, professional React frontend for the InsureMithra Insurance Workflow Automation System.

## 🎨 Features

- **Modern Design**: Clean, professional UI with Material-UI components
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Authentication**: Complete login, registration, and password reset flows
- **Profile Management**: Edit user profile and change password
- **Dashboard**: Beautiful dashboard with statistics and quick actions
- **TypeScript**: Full type safety and better development experience
- **State Management**: Context-based authentication state management

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Backend server running on port 3001

### Installation

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Start development server**
```bash
npm start
```

3. **Open in browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Profile.tsx
│   │   ├── ForgotPassword.tsx
│   │   └── ResetPassword.tsx
│   ├── services/
│   │   └── api.ts
│   ├── config/
│   │   └── api.ts
│   ├── App.tsx
│   ├── App.css
│   └── index.tsx
├── package.json
└── README.md
```

## 🎯 Available Pages

### Authentication
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - New user registration
- **Forgot Password** (`/forgot-password`) - Password reset request
- **Reset Password** (`/reset-password/:token`) - Password reset with token

### Protected Pages
- **Dashboard** (`/dashboard`) - Main dashboard with statistics
- **Profile** (`/profile`) - User profile management

## 🎨 Design Features

### Color Scheme
- **Primary**: #1976d2 (Blue)
- **Secondary**: #dc004e (Red)
- **Background**: #f5f5f5 (Light Gray)
- **Text**: #333333 (Dark Gray)

### Components
- **Material-UI**: Professional component library
- **Responsive Grid**: Adaptive layout for all screen sizes
- **Custom Styling**: Beautiful gradients and animations
- **Icons**: Material Design icons throughout

### Animations
- **Fade In**: Smooth page transitions
- **Hover Effects**: Interactive button and card animations
- **Loading States**: Professional loading indicators

## 🔧 Configuration

### API Configuration
The frontend connects to the backend API. Update the API URL in:
```typescript
// src/config/api.ts
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api',
  TIMEOUT: 10000,
};
```

### Environment Variables
Create a `.env.local` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:3001/api
GENERATE_SOURCEMAP=false
```

## 🧪 Testing

### Manual Testing
1. **Registration Flow**:
   - Navigate to `/register`
   - Fill out the registration form
   - Verify successful registration and auto-login

2. **Login Flow**:
   - Navigate to `/login`
   - Enter credentials
   - Verify successful login and redirect to dashboard

3. **Profile Management**:
   - Navigate to `/profile`
   - Edit profile information
   - Change password
   - Verify updates are saved

4. **Password Reset**:
   - Navigate to `/forgot-password`
   - Enter email address
   - Check for success message

### Automated Testing
```bash
npm test
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Serve Production Build
```bash
npx serve -s build
```

## 📱 Responsive Design

The frontend is fully responsive and works on:
- **Desktop**: Full-featured experience
- **Tablet**: Optimized layout
- **Mobile**: Touch-friendly interface

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Protected Routes**: Automatic redirect for unauthenticated users
- **Input Validation**: Client-side form validation
- **Password Requirements**: Strong password enforcement
- **Auto-logout**: Automatic logout on token expiration

## 🎨 UI/UX Features

### User Experience
- **Intuitive Navigation**: Clear navigation patterns
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation of successful operations

### Visual Design
- **Modern Typography**: Clean, readable fonts
- **Consistent Spacing**: Proper spacing and alignment
- **Color Harmony**: Professional color palette
- **Icon Usage**: Meaningful icons throughout

## 🔧 Development

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Material-UI**: Consistent component usage

## 📞 Support

For technical support or questions:
- **Developer**: Dishan D
- **Test Engineer**: Dhruv Jain
- **QA Lead**: Gujjar R Suman Rao
- **Product Owner**: Harshaa Vardhana KV

## 📄 License

This project is part of the Software Engineering course at PES University.

---

**🎉 The InsureMithra frontend provides a beautiful, professional interface for the complete insurance workflow automation system!**