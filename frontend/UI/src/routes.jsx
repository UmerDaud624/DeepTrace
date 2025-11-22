import { Home, Landing, Profile, SignIn, SignUp, History, Report, Upload } from "@/pages";

export const routes = [
  {
    name: "home",
    path: "/",
    element: <Landing />,
  },
  {
    name: "landing",
    path: "/landing",
    element: <Landing />,
  },
  {
    name: "profile",
    path: "/profile",
    element: <Profile />,
  },
  {
    name: "history",
    path: "/history",
    element: <History />,
  },
  {
    name: "report",
    path: "/report/:id",
    element: <Report />,
  },
  {
    name: "upload",
    path: "/upload",
    element: <Upload />,
  },
  {
    name: "Sign In",
    path: "/sign-in",
    element: <SignIn />,
  },
  {
    name: "Sign Up",
    path: "/sign-up",
    element: <SignUp />,
  },
  
];

export default routes;
