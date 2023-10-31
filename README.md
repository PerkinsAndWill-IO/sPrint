
# sPrint 🏃‍♂️
Printing PDF's from Autodesk Cloud (BIM360/ACC) used to be a time consuming task. Going through all drawings and requesting .PDF's took a while and BIM managers need to quality assurance large drawing sets. sPrint is a Chrome extension that allows batch-print PDFs and download things (derivatives) from Autodesk Cloud Platforms.

![ezgif-4-8877da9391](https://github.com/PerkinsAndWill-IO/sPrint/assets/62248969/776ef003-92f6-4031-923c-be8ed1508264)

<br/><br/>
## Get Started 🚀
### To run locally 🧑‍💻:
1. Navigate to ./extension folder
2. Create .env file
3. Setup environmental variables:

    [AWS access keys guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
    [APS app creation guide](https://aps.autodesk.com/en/docs/oauth/v1/tutorials/create-app/)
    ```
    VITE_AWS_REGION=*******
    VITE_AWS_ACCESS_KEY_ID=*******
    VITE_AWS_SECRET_ACCESS_KEY=*******
    
    VITE_APS_CLIENT_ID=*******
    VITE_APS_CLIENT_SECRET=*******
    ```
4. Run ```npm run build```
5. Run Chrome and go to ```chrome://extensions/```
6. Toggle the **Developer mode** and Load unpacked 
 <img width="635" alt="Screenshot 2023-10-31 212944" src="https://github.com/PerkinsAndWill-IO/sPrint/assets/62248969/05d24552-91a3-463f-bbb5-f426ee82ae6c">

7. Load ```./extension/dist``` folder
8. Check the extension console and copy the callback URL, then set it in the APS app that you created.

<br/><br/>
## Plugin  Architecture 🏛️
The plugin consist of 2 parts:

- Chrome Extension:
  - Popup
  - Background Script - listen to Tab and status changes.
  - Content Script - extends a UI of ACC/BIM360
- Backend:
  - Lambda Function - holds export logic.

![sPrint](https://github.com/PerkinsAndWill-IO/sPrint/assets/62248969/50e0195f-62bb-4108-a5e9-0088fffd77b9)

<br/><br/>
## FAQ ❓
