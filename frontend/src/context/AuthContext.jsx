import { createContext, useEffect, useReducer } from "react"

// Read the persisted user without ever letting corrupt/partial JSON crash the
// app at boot, a bare JSON.parse here would throw before React mounts and
// leave a blank screen with no way to recover.
const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

const initial_state = {
    user: readStoredUser(),
    loading: false,
    error: null,
  };
  
export const AuthContext = createContext(initial_state)

const AuthReducer = (state, action) => {
    switch (action.type) {
        case "LOGIN_START":
            return {
                user: null,
                loading: true,
                error: null,
            }
        case "LOGIN_SUCCESS":
            return {    
                user: action.payload,
                loading: false,
                error: null,
            }
        case "LOGIN_FAILURE":
            return {
                user: null,
                loading: false,
                error: action.payload,
            }
        case "LOGOUT":
            return {
                user: null,
                loading: false,
                error: null,
            }
        case "REGISTER_START":
            return {
                user: null,
                loading: true,
                error: null,
            }
        case "REGISTER_SUCCESS" :
            return{
                user: null,
                loading: false,
                error: null,
            }
        case "REGISTER_FAILURE":
            return {
                user: null,
                loading: false,
                error: action.payload,
            }
        default:
            return state
    }
}

export const AuthContextProvider = ({ children }) => {

    const [state, dispatch] = useReducer(AuthReducer, initial_state)

    useEffect(() => {
        // Persist on login; clear the key entirely on logout (never store the
        // literal string "null").
        if (state.user) {
          localStorage.setItem("user", JSON.stringify(state.user));
        } else {
          localStorage.removeItem("user");
        }
      }, [state.user]);
      
    return <AuthContext.Provider value={{
        user: state.user,
        loading: state.loading,
        error:state.error,
        dispatch,
    }}>
        {children}
    </AuthContext.Provider>
}

