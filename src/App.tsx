import { useEffect , useState} from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import supabase from
export default function App() {
  const { initialize, currentUser, isLoading: authLoading } = useAuthStore();
  const { loadData } = useDataStore();

  // Initialize Supabase auth session on app start
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load data whenever the authenticated user changes
  useEffect(() => {
    if (currentUser && !authLoading) {
      loadData(currentUser.role, currentUser.tenantId);
    }
  }, [currentUser, authLoading, loadData]);
  const [todos, setTodos] = useState([])
6
7  useEffect(() => {
8    async function getTodos() {
9      const { data: todos } = await supabase.from('todos').select()
10
11      if (todos) {
12        setTodos(todos)
13      }
14    }
15
16    getTodos()
17  }, [])
18
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
