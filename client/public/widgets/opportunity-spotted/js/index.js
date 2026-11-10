ZOHO.embeddedApp.on("PageLoad", function (data) {
  const mainContainer = document.getElementById("container");
  const dataContainer = document.getElementById("data-container");
  const loadingIndicator = createLoadingSpinner();
  mainContainer.appendChild(loadingIndicator);

  let recordId = data.EntityId[0];

  ZOHO.CRM.API.getRecord({ Entity: "Deals", RecordID: recordId }).then(
    (response) => {
      if (response && response.data && response.data.length > 0) {
        let record = response.data[0];
        let stage = record?.Stage || "";

        // Hide loader and show data container
        loadingIndicator.style.display = "none";
        dataContainer.classList.remove("hidden");
        dataContainer.classList.add("opacity-100");

        // Show current state
        document.getElementById("currentState").innerText = stage || "Unknown";

        // Render buttons dynamically
        document.getElementById("buttons").innerHTML = `
          <button
            class="text-white px-3 py-1 rounded text-sm font-medium"
            style="background: linear-gradient(0, #3753d3 0%, #5f7cfc 100%);"
            id="btnClientSending"
          >
            Client Sending RFP
          </button>

          <button
            class="text-white px-3 py-1 rounded text-sm font-medium"
            style="background: linear-gradient(0, #3753d3 0%, #5f7cfc 100%);"
            id="btnOnHold"
          >
            On Hold
          </button>
        `;

        // Attach event listeners
        document
          .getElementById("btnClientSending")
          .addEventListener("click", () => stageClientSending(record));

        document
          .getElementById("btnOnHold")
          .addEventListener("click", () => stageOnHold(record));
      }
    }
  );
});

async function updateRecordStage(recordId, newStage) {
  try {
    const config = {
      Entity: "Deals",
      APIData: {
        id: recordId,
        Stage: newStage,
      },
      Trigger: ["workflow"],
    };

    let dealUpt = await ZOHO.CRM.API.updateRecord(config);

    if (dealUpt && dealUpt.data && dealUpt.data[0].code === "SUCCESS") {
      showSuccess(`Stage updated to: ${newStage}`);
      document.getElementById("currentState").innerText = newStage;
      setTimeout(() => {
        ZOHO.CRM.UI.Popup.closeReload();
      }, 2000);
    } else {
      showError(err?.data?.[0]?.message || "Failed to update stage");
    }
  } catch (error) {
    showError(error?.data[0]?.message);
    console.log(error);
  }
}

function stageClientSending(record) {
  updateRecordStage(record.id, "Client Sending RFP");
}

function stageOnHold(record) {
  updateRecordStage(record.id, "OnHold");
}

ZOHO.embeddedApp.init().then(function () {
  ZOHO.CRM.UI.Resize({
    height: "250",
    width: "500",
  }).then(function (res) {
    console.log("Widget resized early:", res);
  });
});

// Loader
function createLoadingSpinner() {
  const loadingIndicator = document.createElement("div");
  loadingIndicator.classList.add(
    "flex",
    "items-center",
    "justify-center",
    "h-full"
  );

  const spinner = document.createElement("div");
  spinner.classList.add(
    "animate-spin",
    "rounded-full",
    "h-16",
    "w-16",
    "border-t-4",
    "border-blue-500"
  );

  loadingIndicator.appendChild(spinner);
  return loadingIndicator;
}

// Success & Error Notification
function showSuccess(message) {
  const notification = document.createElement("div");
  notification.className = "notification notification-success";
  notification.textContent = message;
  document.body.appendChild(notification);
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
    notification.remove();
  }, 3000);
}
function showError(message) {
  const notification = document.createElement("div");
  notification.className = "notification notification-error";
  notification.textContent = message;
  document.body.appendChild(notification);
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
    notification.remove();
  }, 3000);
}
