## Table of contents
- [PAM](#pam)
  - [Contributors](#contributors)
  - [Table of contents](#table-of-contents)
  - [Environment](#environment)
  - [Technologies](#technologies)
    - [Frontend](#frontend)
  - [Features](#features)
  - [Tests](#tests)
  - [Responsiveness](#responsiveness)
  - [Version Control](#version-control)
  - [Architecture](#architecture)

## Environment

The application is designed to work with Node.js version 22.7.0 and npm version 10.8.2. We can't guarantee that it will work properly with other versions of Node.js.

## Technologies

We selected technologies that enable us to build a responsive, efficient, and scalable web application. Our frontend stack allows for dynamic, interactive interfaces with strong type safety and consistent styling.

### Frontend
- **React**: A JavaScript library for building interactive, component-based user interfaces.
- **TypeScript**:  A superset of JavaScript that adds static typing for improved code quality and maintainability.
- **Vite**: A fast development tool that accelerates build times and hot module replacement.
- **Tailwind CSS**: A utility-first CSS framework for rapid and consistent styling.
- **TanStack Query**: A data-fetching library for web applications, but in more technical terms, it makes fetching, caching, synchronizing and updating server state in your web applications a breeze.
- **TanStack Router**: A fully type-safe router with built-in data fetching, stale-while revalidate caching and first-class search-param APIs.

## Features

To meet the requirements of the application, we have implemented several key features focused on efficient navigation, data accessibility, and user-friendly interaction. The main goal has been to make it easy for users to locate, inspect, and analyze deployments and associated data.

1. Deployment Discovery
    - **View lookup table of deployments**: Users are able to view a lookup table for deployments, with information about the last uploaded file.
    - **Filters**: Users can filter deployments by country and status.
    - **Sort Options**: Users can sort deployments alphabetically based on several fields.

2. Deployment Detail Pages
    - **Site and Device Information**: Each deployment has dedicated detail pages providing comprehensive information about the deployment site and the recording device used.
    - **Navigation Integration**: From the deployment view, users can easily access related pages such as data files, observations, and maps.

3. Data Files
    - **Audio File Overview**: For each deployment, users can view a table of all associated audio files. This view includes metadata such as timestamps, file names, and other relevant attributes.

4. Observations
    - **Global Observations Page**: A centralized page lists all observations across deployments.
    - **Contextual Observations**: Users can also view observations linked to a specific audio file directly from its associated page, allowing for a more contextual inspection of data.

5. Map Integration
    - **Global Map View**: An interactive world map displays all deployments as clickable pins. Selecting a pin allows users to navigate directly to the associated deployment.
    - **Deployment-Specific Maps**: Within a deployment’s detail view, users can view a focused map showing only that deployment’s location.
## Tests

To ensure the stability of the most critical parts of the user interface, we implemented basic component tests in the frontend. Using React Testing Library and Vitest, we tested key components with an emphasis on correct data rendering, handling of user interactions, and state changes.

The Observations components was not included in the component testing phase due to its lower priority among the functional requirements and was therefore deprioritized. However, its functionality was validated through user testing with the customer, confirming that the rendered content and results were meaningful and met expectations. For future development, we recommend implementing component tests for Observations to reduce the risk of undetected bugs and improve long-term maintainability.

### How to run
```bash
cd frontend_pam
npm test
```

## Responsiveness
This was not been a huge focus, but there are some pages that are suited to smaller devices like phones.

- **Dynamic Layout**: The design adjusts automatically to different screen dimensions and orientations on select pages, ensuring a smooth and user-friendly experience on both mobile and desktop devices.
- **Testing**: During development, the application was tested on a range of screen sizes, including larger mobile screens like the iPhone 14 Pro Max, to ensure compatibility and usability.

While the application performs well on these devices, we recognize the need to refine and expand testing to include smaller screens in future iterations.

## Version Control

Our project uses Git for version control, hosted on GitHub: [https://github.com/BA07-NINA/ARISE-MDS-sensor-portal-Pam](https://github.com/BA07-NINA/ARISE-MDS-sensor-portal-Pam). We manage our codebase using:

**Branching Strategy**
"Testing": Contains the mostly stable functionality without major bugs.

Other branches: Each new feature or fix is developed on a separate branch. Each branch is connected to an issue in ClickUp. Branches are integrated into "Testing" through pull requests (PRs) with code review from a minimum of one team member, ensuring quality and consistency across the codebase.

**Project Boards and Workflow**
To ensure an organized and efficient development process, we utilized project boards throughout the project. We structured our work into five sprints. For every sprint, we created a dedicated sprint board with columns for To Do, In Progress, and Done. This visual approach helped us clearly see what needed to be done and track progress in real time.

This workflow helps us maintain a clear and organized development process, ensuring high-quality code and efficient collaboration.

## Architecture
The project is structured to maintain a clear separation of concerns and to ensure scalability and maintainability. Here is an overview of the **key** directories and files:

**Select directories in frontend**

- `src/`: Contains the main source code for the frontend.
  - `components/`: Houses reusable React components, each in its own directory.
  - `auth/`
    - `AuthContext.d.ts`: Declaration file
    - `AuthContext.jsx`: Mainly used for user authentication
  - `routes/`
    - `deployments/`
      - `$siteName/`
        - `-deploymentMapPage.tsx`: Map view of the deployment
        - `-deploymentPage.tsx`: Landing page after clicking a deployment
        - `-deviceDataFilesPage.tsx`: Table view of all data files linked the the specifc deployment
        - `-deviceDetailPage.tsx`: Information about the deployment device
        - `-siteDetailPage.tsx`: Information about the deployment site
        - `$dataFieldId.tsx`: Detail about a specifc data file
        - `index.tsx`
      - `-deploymentsPage.tsx`: Table view of all deployments
      - `index.tsx`: 
    - `__root.tsx`: Root component used for Tanstack Router
    - `login.tsx`Login page
    - `index.tsx`: Homepage
    - `map.tsx`: Map over all deployments
  - `index.css`: Define tailwind
  - `main.tsx`: Define router and query provider
- `index.html`: The entry HTML file for the frontend.


This structure ensures the project is organized, with each component and asset easy to locate and manage. It supports maintainability, scalability, and a streamlined development process.