const mainContainer = document.getElementById("container");
const dataContainer = document.getElementById("data-container");
let createBtn = document.getElementById("create-button");

// subform elements
const tableContainer = document.getElementById("table-container");
const addRowButton = document.getElementById("addRow");
// const addSubFormButton = document.getElementById("addSubForm");
const nameInput = document.getElementById("name");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const clientPriceInput = document.getElementById("client-price");
const vendorPriceInput = document.getElementById("vendor-price");
// const visitContactInput = document.getElementById("visit-contact");
const clientBidDueDateInput = document.getElementById("client-bid-due-date");
const vendorBidDueDateInput = document.getElementById("vendor-bid-due-date");
// const isOTSInput = document.getElementById("is-ots-input");
const nameSuggestions = document.getElementById("name-suggestions");
const peopleInput = document.getElementById("people");
const peopleSuggestions = document.getElementById("people-suggestions");
const sowItemErr = document.getElementById("sow-item-err");
const peopleErr = document.getElementById("people-err");

let selectedPeople = [];
let selectedPerson = null; // For single select
let table;
let tableBody;
let accounts = [];
let currentEntityModule = ""
let isOtsSow = null;

ZOHO.embeddedApp.on("PageLoad", async function (entity) {
  const { EntityId, Entity } = entity;
  currentEntityModule = entity.Entity;
  const loadingIndicator = createLoadingSpinner();
  mainContainer.appendChild(loadingIndicator);
  console.log("entity ==>", Entity)

  accounts = [];
  for (const id of EntityId) {
    try {
      let record_data = await ZOHO.CRM.API.getRecord({
        Entity: Entity,
        RecordID: id,
      });
      const record = record_data.data[0];
      if (record) {
        accounts.push(record);
      } else {
        showError("No record found for ID: " + id);
      }
    } catch (err) {
      showError("Error loading record for ID: " + id);
      console.error(err);
    }
  }
  addRowButton.style.display = "none";
  loadingIndicator.style.display = "none";
  dataContainer.classList.remove("hidden");
  dataContainer.classList.add("opacity-100");
  console.log(accounts);
});
ZOHO.embeddedApp.init();

createBtn.addEventListener("click", async function () {
  // selected people ko Zoho format me convert karne ke liye
  const getPeopleForZoho = () => selectedPeople.map(p => ({ id: p.id }));

  const selectedStage = document.getElementById("stage-select").value;
  const selectedContractType = document.getElementById("contract-type-select").value;
  if (!selectedStage) {
    showError("Please select a stage before creating SOW.");
    return;
  }

  // Clear previous errors
  if (sowItemErr) sowItemErr.textContent = "";
  if (peopleErr) peopleErr.textContent = "";

  // Validate SOW Item - check if product is selected from dropdown
  // If user has typed text but hasn't selected from dropdown, show error
  if (nameInput.value.trim() && !nameInput.dataset.productId) {
    if (sowItemErr) sowItemErr.textContent = "Please select a SOW Item from the dropdown.";
    return;
  }

  // if (!tableBody || tableBody.children.length === 0) {
  //   showError("No products to update!");
  //   return;
  // }

  createBtn.disabled = true;
  createBtn.textContent = "Creating...";
  createBtn.classList.add("loading");

  let newProductsData = [];
  console.log("tableBody", tableBody);
  if (tableBody && tableBody.children.length) {
    newProductsData = Array.from(tableBody.children).map((row) => {
      let cells = row.children;
      return {
        OurServices: cells[0].dataset.productId
          ? { id: cells[0].dataset.productId }
          : null,
        Start_Date: cells[1].textContent.trim(),
        End_Date: cells[2].textContent.trim(),
        Invoice_Price:
          cells[3].textContent.trim() === "-"
            ? ""
            : cells[3].textContent.trim(),
        Vendor_Price:
          cells[4].textContent.trim() === "-"
            ? ""
            : cells[4].textContent.trim(),
      };
    });
    console.log("newProductsData", newProductsData);
  }

  const results = [];
  let getUser;
  try {
    getUser = await ZOHO.CRM.CONFIG.getCurrentUser();
  } catch (err) {
    showError("Failed to get current user.");
    createBtn.disabled = false;
    createBtn.textContent = "Create";
    createBtn.classList.remove("loading");
    return;
  }
  let currentUser = getUser.users[0].id || "";
  if (currentUser === "2168928000067994001") {
    currentUser = "2168928000014298001";
  }

  for (const account of accounts) {
    // Site layout (Zoho SDK uses display_label; REST often returns name)
    const layoutLabel =
      account.Layout?.display_label || account.Layout?.name || "";
    if (layoutLabel === "Site") {
      try {
        const siteAcreage = account.Site_Acreage;
        // console.log(siteAcreage)
        const parentAccount = account.Parent_Account?.id || "";
        const dealData = {
          Deal_Name: "Test 30122024",
          Company_Name: { id: account.id },
          Pipeline: "Scope of Work",
          Stage: selectedStage,
          Contract_Term: selectedContractType,
          Sales_Owner: "2168928000000893001",
          Ops_Owner: "2168928000000938001",
          // Operations_Associate_New: "2168928000000893001",
          Operations_Associate_New: "2168928000000938001",
          Client_Site_Visit_Contact: selectedPerson ? { id: selectedPerson.id } : null,
          Account_Name: parentAccount ? { id: parentAccount } : null,
          Sales_Associate_New: currentUser,
          Site_Visit_Assignment: "operations" || "Operations",
          Scope_of_Work: newProductsData || null,
          Client_Bid_Due_Date: clientBidDueDateInput.value,
          Vendor_Bid_Due_Date: vendorBidDueDateInput.value,
          Site_Acreage: siteAcreage?.toString(),
          Is_OTS_SOW: isOtsSow || false,
        };
        console.log("account", account);
        console.log("dealData ==>", dealData);

          const createResponse = await ZOHO.CRM.API.insertRecord({
          Entity: "Deals",
          APIData: dealData,
          Trigger: ["workflow"],
        });

        const newDealId = createResponse.data[0]?.details?.id;
        if (!newDealId) {
          results.push({
            name: account.Account_Name || account.Name || account.id,
            success: false,
            error: "Failed to create SOW record.",
          });
          continue;
        }

        const newDealResponse = await ZOHO.CRM.API.getRecord({
          Entity: "Deals",
          RecordID: newDealId,
        });

        const newDealData = newDealResponse.data[0];
        const newSOWID = newDealData?.SOWID || "";

        if (!newSOWID) {
          results.push({
            name: account.Account_Name || account.Name || account.id,
            success: false,
            error: "SOWID not found after creation.",
          });
          continue;
        }

        await ZOHO.CRM.API.updateRecord({
          Entity: "Deals",
          APIData: {
            id: newDealId,
            Deal_Name: newSOWID,
            SOW_Name_Retention: null,
          },
        });

        results.push({
          name: account.Account_Name || account.Name || account.id,
          success: true,
          sowName: newSOWID,
          dealId: newDealId,
        });
        // ===== UPDATE CLIENT/SITE RECORD WITH SELECTED PEOPLE =====
        // try {
        //   const peopleForZoho = selectedPeople.map(p => ({ id: p.id }));

        //   if (peopleForZoho.length) {
        //     await ZOHO.CRM.API.updateRecord({
        //       Entity: currentEntityModule,
        //       APIData: {
        //         id: account.id,
        //         Region_Distric_Zone: peopleForZoho[0].id
        //       }
        //     });
        //   }
        // } catch (updateErr) {
        //   console.error("People update failed:", updateErr);
        // }

      } catch (err) {
        results.push({
          name: account.Account_Name || account.Name || account.id,
          success: false,
          error: err?.message || "An error occurred while creating SOW.",
        });
      }
    } else {
      // For Client, just show that account name is Client
      results.push({
        name: account.Account_Name || account.Name || account.id,
        success: false,
        error: "This account is a Client.",
      });
    }
  }

  showResultsModal(results);
  // Clear table and unselect stage
  if (tableBody) {
    tableBody.innerHTML = "";
    if (table) table.classList.add("hidden");
  }
  addRowButton.style.display = "none";
  document.getElementById("stage-select").value = "";
  clientBidDueDateInput.value = "";
  vendorBidDueDateInput.value = "";
  // Clear people field
  peopleInput.value = "";
  selectedPerson = null;
  peopleInput.dataset.personId = "";
  if (peopleErr) peopleErr.textContent = "";
  // Clear SOW Item field
  nameInput.value = "";
  nameInput.dataset.productId = "";
  if (sowItemErr) sowItemErr.textContent = "";

  createBtn.disabled = false;
  createBtn.textContent = "Create";
  createBtn.classList.remove("loading");
});

// isOTSInput.addEventListener("input", function () {
//   isOtsSow = this.checked;
// })

nameInput.addEventListener("input", async function () {
  let query = nameInput.value.trim();

  // If user is typing and there's a selected product, clear the selection
  if (nameInput.dataset.productId && nameInput.value !== query) {
    nameInput.dataset.productId = "";
  }

  if (query.length <= 2) {
    nameSuggestions.innerHTML = "";
    if (sowItemErr) sowItemErr.textContent = "Please enter at least 3 characters";
    nameSuggestions.classList.add("hidden");
    return;
  }

  try {
    if (sowItemErr) sowItemErr.textContent = "";

    // Use Products search API (module READ) instead of COQL — app OAuth
    // often lacks ZohoCRM.coql.READ that the original Zoho connection used.
    // Search Records API supports starts_with (not contains).
    const safeQuery = query
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

    const response = await ZOHO.CRM.API.searchRecord({
      Entity: "Products",
      Type: "criteria",
      Query: `(Product_Name:starts_with:${safeQuery})`,
    });

    let data = response.data || [];
    nameSuggestions.innerHTML = "";

    if (data.length) {
      data.forEach((product) => {
        let li = document.createElement("li");
        li.textContent = product.Product_Name;
        li.className = "p-2 hover:bg-gray-200 cursor-pointer";

        li.addEventListener("click", function () {
          nameInput.value = product.Product_Name;
          nameInput.dataset.productId = product.id;
          nameSuggestions.classList.add("hidden");

          if (sowItemErr) sowItemErr.textContent = "";
          addRowButton.style.display = "inline-block";
        });

        nameSuggestions.appendChild(li);
      });

      nameSuggestions.classList.remove("hidden");
    } else {
      let li = document.createElement("li");
      li.className = "p-2 hover:bg-gray-200 cursor-pointer";

      li.textContent = "No Products found";
      nameSuggestions.appendChild(li);
      nameSuggestions.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Zoho API Error:", error);
    nameSuggestions.innerHTML = "";
    nameSuggestions.classList.add("hidden");
    if (sowItemErr) {
      sowItemErr.textContent = "Unable to search products. Please try again.";
    }
  }
});

document.addEventListener("click", function (event) {
  if (
    !nameInput.contains(event.target) &&
    !nameSuggestions.contains(event.target)
  ) {
    nameSuggestions.classList.add("hidden");

    // If user clicked outside and there's no valid selection, clear the input
    if (!nameInput.dataset.productId && nameInput.value.trim()) {
      nameInput.value = "";
      if (sowItemErr) sowItemErr.textContent = "";
    }
  }
});

addRowButton.addEventListener("click", function () {
  // if (!nameInput.value.trim() || !startDateInput.value || !endDateInput.value) {
  //   showError("Product name, start date, and end date are required!");
  //   return;
  // }

  let nameTDs = document.querySelectorAll("#name-td");
  console.log(nameTDs);

  // agr first item hai aur ots hai:
  // to name value bhi ots hona chahiye wrna error do return krdo
  // agr non ots hai so name value bhi non ots hona chahiye 
  // wrna error do return krdo

  const productNameArr = Array.from(nameTDs);
  // console.log("productNameArr", productNameArr);

  const firstProductItem = productNameArr.length && productNameArr[0];
  // console.log("firstProductItem", firstProductItem);

  if (firstProductItem) {
    if (firstProductItem.textContent.toLowerCase().includes("ots")) {
      // console.log("it is ots")
      isOtsSow = true;
      if (!nameInput.value.toLowerCase().includes("ots")) {
        showError("only select OTS service items for an OTS SOW")
        return;
      }
    } else {
      // console.log("it is non ots");
      isOtsSow = false;
      if (nameInput.value.toLowerCase().includes("ots")) {
        showError("OTS service items are not allowed for this SOW.")
        return;
      }
    }
  }

  let existingRow = Array.from(nameTDs).find(
    (td) => td.textContent === nameInput.value
  );
  console.log("existingRow", existingRow);

  if (existingRow) {
    showError("Product already added!");
    return;
  }

  if (!table) {
    table = document.createElement("table");
    table.className = "w-full mt-4 border-collapse hidden";
    table.innerHTML = `
                    <thead class="bg-gray-200 sticky top-0 z-10 text-left">
                        <tr class="bg-gray-200">
                            <th class="p-2 border">Product Name</th>
                            <th class="p-2 border">Start Date</th>
                            <th class="p-2 border">End Date</th>
                            <th class="p-2 border">Client Price</th>
                            <th class="p-2 border">Vendor Price</th>
                            <th class="p-2 border">Action</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
    tableBody = table.querySelector("tbody");
    tableContainer.appendChild(table);
  }

  let row = document.createElement("tr");
  row.className =
    "bg-white border transition-transform transform scale-95 opacity-0";
  row.innerHTML = `
                 <td id="name-td" class="p-2 border" data-product-id="${nameInput.dataset.productId
    }">${nameInput.value}</td>
                <td class="p-2 border">${startDateInput.value}</td>
                <td class="p-2 border">${endDateInput.value}</td>
                <td class="p-2 border">${clientPriceInput.value ? clientPriceInput.value : "-"
    }</td>
                <td class="p-2 border">${vendorPriceInput.value ? vendorPriceInput.value : "-"
    }</td>
                <td class="p-2 border text-center">
                    <button class="text-red-500 font-bold">-</button>
                </td>
            `;



  // Delete Row Function
  row.querySelector("button").addEventListener("click", function () {
    row.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      row.remove();
      if (!tableBody.children.length) {
        table.classList.add("hidden");
        addRowButton.style.display = "none";
      }
    }, 300);
  });

  tableBody.appendChild(row);

  // Animate Table Appearance
  table.classList.remove("hidden");
  setTimeout(() => {
    row.classList.remove("scale-95", "opacity-0");
  }, 100);

  // Show "Add SubForm" Button
  createBtn.style.display = "block";

  // Clear Inputs
  nameInput.value = "";
  nameInput.dataset.productId = "";
  if (sowItemErr) sowItemErr.textContent = "";
  startDateInput.value = "";
  endDateInput.value = "";
  clientPriceInput.value = "";
  vendorPriceInput.value = "";
});

peopleInput.addEventListener("input", async function () {
  const query = peopleInput.value.trim();

  // If user is typing and there's a selected person, clear the selection
  if (selectedPerson && peopleInput.value !== selectedPerson.name) {
    selectedPerson = null;
    peopleInput.dataset.personId = "";
  }

  if (query.length <= 1) {
    peopleSuggestions.innerHTML = "";
    peopleSuggestions.classList.add("hidden");
    return;
  }

  try {
    const response = await ZOHO.CRM.API.searchRecord({
      Entity: "Contacts",
      Type: "criteria",
      Query: `(Full_Name:starts_with:${query})`
    });

    const data = response.data || [];
    peopleSuggestions.innerHTML = "";

    if (data.length) {
      data.forEach(contact => {
        const li = document.createElement("li");
        li.textContent = contact.Full_Name;
        li.className = "p-2 hover:bg-gray-200 cursor-pointer";

        li.addEventListener("click", () => {
          // Single select - store only one person
          selectedPerson = {
            id: contact.id,
            name: contact.Full_Name
          };

          // Show selected value in input
          peopleInput.value = contact.Full_Name;
          peopleInput.dataset.personId = contact.id;
          peopleSuggestions.classList.add("hidden");
          if (peopleErr) peopleErr.textContent = ""; // Clear error when valid selection is made
        });

        peopleSuggestions.appendChild(li);
      });

      peopleSuggestions.classList.remove("hidden");
    } else {
      peopleSuggestions.classList.add("hidden");
    }

  } catch (err) {
    console.error("Contacts fetch error:", err);
    peopleSuggestions.classList.add("hidden");
  }
});

document.addEventListener("click", function (event) {
  if (!peopleInput.contains(event.target) &&
    !peopleSuggestions.contains(event.target)) {
    peopleSuggestions.classList.add("hidden");

    // If user clicked outside and there's no valid selection, clear the input
    if (!selectedPerson || (peopleInput.value.trim() && peopleInput.value !== selectedPerson.name)) {
      peopleInput.value = "";
      selectedPerson = null;
      peopleInput.dataset.personId = "";
      if (peopleErr) peopleErr.textContent = "";
    }
  }
});

// Helper functions
function createLoadingSpinner() {
  const loadingIndicator = document.createElement("div");
  loadingIndicator.classList.add(
    "flex",
    "items-center",
    "justify-center",
    "h-full",
    "w-full"
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

function showSuccess(message) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg opacity-0 translate-y-[-20px] transition-all duration-300";
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show animation
  setTimeout(() => {
    notification.classList.remove("opacity-0", "translate-y-[-20px]");
    notification.classList.add("opacity-100", "translate-y-0");
  }, 10);

  // Hide after 3s
  setTimeout(() => {
    notification.classList.remove("opacity-100");
    notification.classList.add("opacity-0");

    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

function showError(message) {
  const notification = document.createElement("div");
  notification.className =
    "fixed top-5 right-5 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg opacity-0 translate-y-[-20px] transition-all duration-300";
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show animation
  setTimeout(() => {
    notification.classList.remove("opacity-0", "translate-y-[-20px]");
    notification.classList.add("opacity-100", "translate-y-0");
  }, 10);

  // Hide after 3s
  setTimeout(() => {
    notification.classList.remove("opacity-100");
    notification.classList.add("opacity-0");

    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

function showResultsModal(results) {
  // Remove any existing modal
  const existing = document.getElementById("sow-results-modal");
  if (existing) existing.remove();

  // Modal overlay
  const modal = document.createElement("div");
  modal.id = "sow-results-modal";
  Object.assign(modal.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(30,41,59,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999",
    fontFamily: "Inter, Arial, sans-serif",
  });

  // Modal content
  const content = document.createElement("div");
  Object.assign(content.style, {
    background: "#fff",
    padding: "1.4rem 2rem",
    borderRadius: "16px",
    maxWidth: "640px",
    width: "100%",
    maxHeight: "85vh",
    boxShadow: "0 8px 32px rgba(30,41,59,0.18)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  });

  // Title
  const title = document.createElement("h2");
  title.textContent = "SOW Creation Results";
  Object.assign(title.style, {
    marginBottom: "1.25rem",
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: "0.01em",
  });
  content.appendChild(title);

  // Points list container (scrollable)
  const listWrapper = document.createElement("div");
  Object.assign(listWrapper.style, {
    flex: "1 1 auto",
    overflowY: "auto",
    marginBottom: "1.5rem",
    paddingRight: "0.5rem",
    maxHeight: "40vh",
  });

  // Points list (ul)
  const list = document.createElement("ul");
  Object.assign(list.style, {
    listStyle: "none",
    padding: "0",
    margin: "0",
  });

  for (const [i, result] of results.entries()) {
    const li = document.createElement("li");
    Object.assign(li.style, {
      display: "flex",
      alignItems: "flex-start",
      marginBottom: "1.1rem",
      fontSize: "1rem",
    });

    // Point icon
    const icon = document.createElement("span");
    icon.innerHTML = result.success
      ? `<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#22c55e"/><path d="M8 12.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ef4444"/><path d="M15 9l-6 6M9 9l6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
    Object.assign(icon.style, {
      flex: "none",
      marginRight: "0.75rem",
      marginTop: "2px",
    });
    li.appendChild(icon);

    // Text content
    const text = document.createElement("div");
    if (result.success) {
      text.innerHTML = `<span style="font-weight:600;color:#16a34a">${result.name}:</span> `;
      const link = document.createElement("a");
      link.href = `https://crm.zoho.com/crm/oliogroup/tab/Deals/${result.dealId}`;
      link.textContent = `Created this SOW: ${result.sowName}`;
      Object.assign(link.style, {
        color: "#2563eb",
        textDecoration: "underline",
        fontWeight: "500",
      });
      link.target = "_blank";
      text.appendChild(link);
    } else {
      text.innerHTML = `<span style="font-weight:600;color:#dc2626">${result.name}:</span> <span style="color:#dc2626;font-weight:500">Failed</span> — <span style="color:#64748b">${result.error}</span>`;
    }
    li.appendChild(text);

    list.appendChild(li);
  }
  listWrapper.appendChild(list);
  content.appendChild(listWrapper);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  Object.assign(closeBtn.style, {
    marginTop: "0.5rem",
    padding: "0.6rem 2.2rem",
    background: "linear-gradient(90deg,#2563eb 0%,#1e40af 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    alignSelf: "center",
    boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
    transition: "background 0.2s",
  });
  closeBtn.onmouseover = () => (closeBtn.style.background = "#1e40af");
  closeBtn.onmouseleave = () =>
  (closeBtn.style.background =
    "linear-gradient(90deg,#2563eb 0%,#1e40af 100%)");
  closeBtn.onclick = () => modal.remove();
  content.appendChild(closeBtn);

  modal.appendChild(content);
  document.body.appendChild(modal);
}