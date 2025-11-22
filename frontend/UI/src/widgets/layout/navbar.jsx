import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  Navbar as MTNavbar,
  MobileNav,
  Typography,
  Button,
  IconButton,
} from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "@/contexts/ThemeContext";

export function Navbar({ brandName, routes, action }) {
  const [openNav, setOpenNav] = React.useState(false);
  const { isDark } = useTheme();

  React.useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth >= 960 && setOpenNav(false)
    );
  }, []);

  const navList = (
    <ul className="mb-4 mt-2 flex flex-col gap-2 text-inherit lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-4">
      {routes.map(({ name, path, icon, href, target }) => (
        <Typography
          key={name}
          as="li"
          variant="small"
          color="inherit"
          className="capitalize"
        >
          {href ? (
            <a
              href={href}
              target={target}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-sm rounded-lg transition-all duration-300 border border-transparent transform hover:scale-105 relative overflow-hidden group ${
                isDark 
                  ? 'text-purple-200 hover:text-white hover:bg-gradient-to-r hover:from-pink-500/20 hover:via-purple-500/20 hover:to-cyan-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/30'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-gradient-to-r hover:from-purple-500/10 hover:via-indigo-500/10 hover:to-blue-500/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-purple-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {icon &&
                React.createElement(icon, {
                  className: "w-4 h-4 relative z-10",
                })}
              <span className="relative z-10">{name}</span>
            </a>
          ) : (
            <Link
              to={path}
              target={target}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-sm rounded-lg transition-all duration-300 border border-transparent transform hover:scale-105 relative overflow-hidden group ${
                isDark 
                  ? 'text-purple-200 hover:text-white hover:bg-gradient-to-r hover:from-pink-500/20 hover:via-purple-500/20 hover:to-cyan-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/30'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-gradient-to-r hover:from-purple-500/10 hover:via-indigo-500/10 hover:to-blue-500/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-purple-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {icon &&
                React.createElement(icon, {
                  className: "w-4 h-4 relative z-10",
                })}
              <span className="relative z-10">{name}</span>
            </Link>
          )}
        </Typography>
      ))}
    </ul>
  );

  return (
    <MTNavbar 
      color="transparent" 
      className={`backdrop-blur-xl py-0 fixed top-0 z-50 w-full relative overflow-hidden h-12 ${
        isDark 
          ? 'bg-gradient-to-r from-black/95 via-gray-900/95 to-black/95 border-b-2 border-purple-500/40 shadow-2xl shadow-purple-500/30'
          : 'bg-gradient-to-r from-white/95 via-gray-50/95 to-white/95 border-b-2 border-purple-500/30 shadow-2xl shadow-purple-500/20'
      }`}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/10 to-cyan-500/5 opacity-80"></div>
      
      {/* Glowing top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-60"></div>
      
      <div className="container mx-auto flex items-center justify-between relative z-10">
        <Link to="/">
          <Typography className={`mr-3 ml-2 cursor-pointer py-0.5 font-black text-lg bg-clip-text text-transparent transition-all duration-300 hover:scale-105 transform relative ${
            isDark 
              ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 hover:from-pink-300 hover:via-purple-300 hover:to-cyan-300'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500'
          }`}>
            {brandName}
            {/* Glow effect behind text */}
            <div className={`absolute inset-0 blur-lg opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10 ${
              isDark 
                ? 'bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-cyan-400/20'
                : 'bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-blue-600/20'
            }`}></div>
          </Typography>
        </Link>
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          {navList}
          <ThemeToggle />
        </div>
        
        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <IconButton
            variant="text"
            size="sm"
            className={`transition-all duration-300 transform hover:scale-110 border-2 rounded-xl shadow-lg ${
              isDark 
                ? 'text-purple-300 hover:text-purple-200 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 focus:bg-purple-500/20 active:bg-purple-500/30 border-purple-500/40 hover:border-purple-400/60 shadow-purple-500/30 hover:shadow-purple-500/50'
                : 'text-purple-600 hover:text-purple-700 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10 focus:bg-purple-500/10 active:bg-purple-500/20 border-purple-500/30 hover:border-purple-400/50 shadow-purple-500/20 hover:shadow-purple-500/30'
            }`}
            onClick={() => setOpenNav(!openNav)}
          >
            {openNav ? (
              <XMarkIcon strokeWidth={2} className="h-6 w-6" />
            ) : (
              <Bars3Icon strokeWidth={2} className="h-6 w-6" />
            )}
          </IconButton>
        </div>
      </div>
      <MobileNav
        className={`rounded-2xl border-2 px-6 pt-4 pb-6 shadow-2xl backdrop-blur-xl ${
          isDark 
            ? 'bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 border-purple-500/40 text-purple-300 shadow-purple-500/40'
            : 'bg-gradient-to-br from-white/95 via-gray-50/95 to-white/95 border-purple-500/30 text-purple-700 shadow-purple-500/20'
        }`}
        open={openNav}
      >
        <div className="container mx-auto">
          {navList}
         
          {action && React.isValidElement(action)
            ? React.cloneElement(action, { className: "w-full block" })
            : null}
        </div>
      </MobileNav>
    </MTNavbar>
  );
}



Navbar.propTypes = {
  brandName: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  action: PropTypes.node,
};

Navbar.displayName = "/src/widgets/layout/navbar.jsx";

export default Navbar;
