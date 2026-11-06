import { RouterProvider, createBrowserRouter } from 'react-router'
import { appRoutes } from './routes'

const router = createBrowserRouter(appRoutes)

export function App() {
  return <RouterProvider router={router} />
}
