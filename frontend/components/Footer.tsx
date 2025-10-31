import React from "react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-neutral-200 dark:border-neutral-800 mt-10 pt-6 pb-8 text-sm text-neutral-600 dark:text-neutral-400 absolute bottom-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-center md:text-left">© {year} Sol Poll. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
          >
            Privacy
          </a>
          <a
            href="#"
            className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


