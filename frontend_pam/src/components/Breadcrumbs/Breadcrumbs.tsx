import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;
  const pathRef = useRef<string | null>(null);
  const [modifiedPaths, setModifiedPaths] = useState<Array<{label: string, path: string}>>([]);
  
  useEffect(() => {
    // Skip if we've already processed this path
    if (pathRef.current === pathname) {
      return;
    }
    
    // Update our ref to the current pathname
    pathRef.current = pathname;
    
    // Get path segments
    const paths = pathname.split('/').filter((segment) => segment);
    
    // Check if we're on a data file page (deployments/deviceId/dataFileId)
    if (paths.length >= 3 && paths[0] === 'deployments' && !isNaN(Number(paths[2]))) {
      const deviceId = paths[1];
      
      // Try to get the site name from sessionStorage
      const siteName = sessionStorage.getItem(`site_name_for_${deviceId}`);
      
      if (siteName) {
        // Create modified breadcrumbs with the correct site name for the deployment link
        const newPaths = paths.map((segment, index) => {
          const path = '/' + paths.slice(0, index + 1).join('/');
          const label = capitalize(segment);
          
          // For the deployment breadcrumb, use the site name instead of the device ID
          if (index === 1) {
            return {
              label,
              path: `/deployments/${siteName}`
            };
          }
          
          return { label, path };
        });
        
        setModifiedPaths(newPaths);
        return;
      }
    }
    
    // Default behavior if we're not on a data file page or don't have the site name
    const defaultPaths = paths.map((segment, index) => {
      const path = '/' + paths.slice(0, index + 1).join('/');
      return { label: capitalize(segment), path };
    });
    
    setModifiedPaths(defaultPaths);
  }, [pathname]); // Only depend on the pathname string, not the paths array

  const currentPage = modifiedPaths.length > 0 ? modifiedPaths[modifiedPaths.length - 1].label : 'Overview';

  return (
    <>
      <h1 className="text-lg lg:text-2xl font-bold px-3 py-2 ">{currentPage}</h1>
      <nav className="p-3 w-full border-b border-gray-300 hidden sm:block">
        <ol className="list-reset flex text-black">
          <li>
            <Link to="/" className="hover:underline text-black">Overview</Link>
            {pathname !== '/' && <span className="mx-2">&gt;</span>}
          </li>
          {modifiedPaths.map((breadcrumb, index) => (
            <li key={breadcrumb.path} className="flex items-center">
              <Link to={breadcrumb.path} className="hover:underline text-black">
                {breadcrumb.label}
              </Link>
              {index < modifiedPaths.length - 1 && <span className="mx-2">&gt;</span>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export default Breadcrumbs;

