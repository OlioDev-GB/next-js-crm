let apiKey = window.__GROQ_API_KEY || "";
document.addEventListener("mousemove", function (e) {
  const images = document.querySelectorAll(".card-image img");
  images.forEach((img) => {
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const originX = (offsetX / rect.width) * 100;
    const originY = (offsetY / rect.height) * 100;
    img.style.transformOrigin = `${originX}% ${originY}%`;
  });
});
document.addEventListener("mouseover", function (e) {
  if (e.target.matches(".card-image img")) {
    e.target.style.transform = "scale(1.8)";
  }
});
document.addEventListener("mouseout", function (e) {
  if (e.target.matches(".card-image img")) {
    e.target.style.transform = "scale(1)";
  }
});

function showImagePopup(src) {
  const popup = document.createElement("div");
  popup.className = "image-popup";

  const img = document.createElement("img");
  img.src = src;

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "X";
  closeBtn.addEventListener("click", () => {
    popup.classList.remove("show");
    setTimeout(() => popup.remove(), 300);
  });

  popup.appendChild(img);
  popup.appendChild(closeBtn);
  document.body.appendChild(popup);

  setTimeout(() => popup.classList.add("show"), 10);
}

document.addEventListener("click", function (e) {
  if (e.target.matches(".enlarge-link")) {
    e.preventDefault();
    const imgElement = e.target.previousElementSibling;
    if (imgElement && imgElement.tagName === "IMG") {
      showImagePopup(imgElement.src);
    }
  }
});

function getVendorContractNameFromListItem(item) {
  if (!item) return "N/A";
  const fromLookup = item.cv_data?.Vendor_Contract;
  const vc = item.vendor_contract;
  return (
    vc?.Name ??
    vc?.name ??
    (typeof fromLookup === "object" && fromLookup != null ? fromLookup.name : null) ??
    (typeof fromLookup === "object" && fromLookup != null ? fromLookup.Name : null) ??
    (typeof fromLookup === "string" ? fromLookup : null) ??
    "N/A"
  );
}

function getCoiExpirationFromListItem(item) {
  if (!item) return null;
  const vc = item.vendor_contract;
  const vendorLookup = vc && typeof vc.Vendor === "object" && vc.Vendor !== null ? vc.Vendor : null;
  return (
    item.vendor?.COI_Expiration ??
    item.COI_Expiration ??
    vc?.COI_Expiration ??
    vendorLookup?.COI_Expiration ??
    item.cv_data?.COI_Expiration
  );
}

function parseCRMDate(value) {
  if (value == null || value === "") return null;
  let raw = value;
  if (typeof raw === "object" && raw.date != null) {
    raw = raw.date;
  }
  if (typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (iso) {
      const y = parseInt(iso[1], 10);
      const m = parseInt(iso[2], 10) - 1;
      const day = parseInt(iso[3], 10);
      return new Date(y, m, day);
    }
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** True when COI_Expiration is on or before (today - 30 calendar days). */
function isVendorCoiExpired30Days(coiExpiration) {
  const exp = parseCRMDate(coiExpiration);
  if (!exp) return false;
  const today = startOfLocalDay(new Date());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 30);
  const expDay = startOfLocalDay(exp);
  return expDay.getTime() <= cutoff.getTime();
}

/**
 * CRM module API name for the invoice (`cv_data`) records. Override if your module differs,
 * or populate `$se_module` on `cv_data` from Deluge — see resolveInvoiceModuleApiName.
 */
const CRM_INVOICE_MODULE_API_NAME = "Vendor_Invoices";

function resolveInvoiceModuleApiName(cvData) {
  if (!cvData || typeof cvData !== "object") return CRM_INVOICE_MODULE_API_NAME;
  return cvData.$se_module || cvData.se_module || CRM_INVOICE_MODULE_API_NAME;
}

/** Sets Status_Validation on the invoice record backing `cv_data` (boolean). */
function updateCvDataStatusValidation(cvData, value) {
  const Entity = resolveInvoiceModuleApiName(cvData);
  const recordId = cvData?.id;
  return new Promise((resolve, reject) => {
    if (!recordId) {
      reject(new Error("Missing invoice record id"));
      return;
    }
    if (typeof ZOHO === "undefined" || !ZOHO.CRM || !ZOHO.CRM.API || !ZOHO.CRM.API.updateRecord) {
      reject(new Error("ZOHO.CRM.API.updateRecord is not available"));
      return;
    }
    ZOHO.CRM.API.updateRecord({
      Entity,
      APIData: {
        id: recordId,
        Status_Validation: value,
      },
    })
      .then((res) => {
        const row = res?.data?.[0];
        if (row?.code === "ERROR" || row?.status === "error") {
          reject(new Error(row?.message || String(row?.details || "") || "CRM update failed"));
          return;
        }
        resolve(res);
      })
      .catch(reject);
  });
}

/** Logged-in CRM user's profile name (e.g. Zoho profile display name), or null if unavailable. */
function getCurrentUserProfileName() {
  return new Promise((resolve) => {
    if (
      typeof ZOHO === "undefined" ||
      !ZOHO.CRM ||
      !ZOHO.CRM.CONFIG ||
      !ZOHO.CRM.CONFIG.getCurrentUser
    ) {
      resolve(null);
      return;
    }
    ZOHO.CRM.CONFIG.getCurrentUser()
      .then((data) => {
        const profile = data?.users?.[0]?.profile;
        const name = profile?.name ?? profile?.Name ?? null;
        resolve(typeof name === "string" && name.trim() !== "" ? name.trim() : null);
      })
      .catch((err) => {
        console.error("getCurrentUser:", err);
        resolve(null);
      });
  });
}

function isDevUserProfile(profileName) {
  return profileName != null && String(profileName).trim() === "Operations Rep";
}

ZOHO.embeddedApp.on("PageLoad", function (entity) {
  console.log("Entity loaded: ", entity);

  const customView_id = entity.EntityId;
  const reqData = {
    arguments: JSON.stringify({
      cv_id: { customView_id },
    }),
  };
  const mainContainer = document.getElementById("main-container");
  const loadingIndicator = createLoadingSpinner();
  mainContainer.appendChild(loadingIndicator);

  function fetchData() {
    ZOHO.CRM.FUNCTIONS.execute("vendor_invoices_and_contract", reqData)
      .then((data) => {
        console.log("Function response data:", data);

        const response = JSON.parse(data.details.output);
        const lists = response.lists;
        console.log("Lists fetched: ", lists);

        loadingIndicator.style.display = "none";
        mainContainer.style.display = "block";

        const container = document.getElementById("widget-container");

        container.innerHTML = "";

        if (lists && lists.length > 0) {
          lists.forEach((item, index) => {
            const {
              cv_data,
              client_contract,
              client_contract_error,
              vendor_contract,
              invoice_url,
              pdf,
              vendor_contract_error,
              workdrive_error,
            } = item;

            const buttonId = `approve-btn-${index}`;
            const AIButtonId = `ai-btn-${index}`;
            const modalButtonId = `modal-btn-${index}`;
            const resultButtonId = `result-btn-${index}`;

            const generateCardHTML = (
              workdrive_error,
              pdf,
              invoice_url,
              cv_data,
              vendor_contract_error,
              vendor_contract,
              buttonId,
              modalButtonId,
            ) => {
              const imageSection =
                pdf ?
                  `<button class="openPdf" onclick="window.open('${invoice_url}', '_blank')">Open PDF</button>`
                : `
                    <img src="${
                      invoice_url || "https://www.svgrepo.com/show/508699/landscape-placeholder.svg"
                    }" alt="Invoice Image">
                    ${
                      invoice_url !== null ?
                        `<a href="#" class="enlarge-link">Click to Enlarge</a>`
                      : ""
                    }
                  `;

              const contractServices =
                (
                  vendor_contract?.Our_Services_SubForm &&
                  vendor_contract?.Our_Services_SubForm.length > 0
                ) ?
                  `
                      <div class="table-responsive">
                      <table class="table table-bordered">
                        <thead class="thead-light">
                        <tr>
                          <th style="width: 30%; white-space: nowrap;">Service Name</th>
                          <th style="width: 20%; white-space: nowrap;">Start Date</th>
                          <th style="width: 20%; white-space: nowrap;">End Date</th>
                          <th style="width: 15%; white-space: nowrap;">Vendor Price</th>
                          <th style="width: 15%; white-space: nowrap;">Client Price</th>
                        </tr>
                        </thead>
                        <tbody>
                        ${vendor_contract?.Our_Services_SubForm?.map((service) => {
                          // const extractedRate = getExtractedRateFromAI(service?.OurServices?.name);
                          // const matchStatus = extractedRate === service?.Invoice_Price ? "Match" : "No Match";
                          return `
                          <tr>
                            <td style="white-space: nowrap;">
                            ${
                              service?.OurServices?.name.length > 20 ?
                                `<span title="${
                                  service?.OurServices?.name
                                }">${service?.OurServices?.name.substring(0, 20)}...</span>`
                              : service?.OurServices?.name || "N/A"
                            }
                            </td>
                            <td>${service?.Start_Date || "N/A"}</td>
                            <td>${service?.End_Date || "N/A"}</td>
                            <td><strong>$${service?.Vendor_Price || "N/A"}</strong></td>
                            <td><strong>$${service?.Invoice_Price || "N/A"}</strong></td>
                          </tr>
                          `;
                        }).join("")}
                        </tbody>
                      </table>
                      </div>
                    `
                : "<p>No SOW available</p>";

              const contentSection = `
                <div style="max-width: 100%; padding: 20px;">
                  <div class="contentArea">
                    ${
                      vendor_contract_error ?
                        `<p style="color:red;">${vendor_contract_error}</p>`
                      : `
                      <div>
                        <h3>${cv_data?.Name || "N/A"}</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span>${cv_data?.Month_of_Service || "N/A"} ${cv_data?.Year_of_Service || "N/A"}</span>
                          <h4 style="margin: 0;">
                            <a href="#" class="contract-name-link tooltip-trigger"
                              data-site="${vendor_contract?.Site?.name || ""}"
                              data-address="${vendor_contract?.Site_Street || ""}"
                              data-city="${vendor_contract?.Site_City || ""}"
                              data-state="${vendor_contract?.Site_State || ""}"
                              data-zip="${vendor_contract?.Site_Zip || ""}">
                              ${cv_data?.Vendor_Contract?.name || "N/A"}
                              <span class="info-icon">ⓘ</span>
                            </a>
                            <div class="custom-tooltip"></div>
                          </h4>
                        </div>
                        ${contractServices}
                      </div>
                    `
                    }
                    <div class="btnDiv">
                    <div style="display: flex; align-items: center; width: 100%;">
                      <button id="${AIButtonId}" class="aiAction">Compare with AI</button>
                      <button id="${resultButtonId}" class="results">Results</button>
                    </div>
                      <div class="mainBtn">
                        <button id="${buttonId}" class="approved" style="width: 60%; padding: 8px; background: ${
                          cv_data?.Status !== "Open" ? "#d1d1d1;" : "#28a745;"
                        } color: #fff; border: none; font-size: 1em; cursor: ${
                          cv_data?.Status !== "Open" ? "no-drop" : "pointer"
                        };" ${cv_data?.Status !== "Open" ? "disabled" : ""}>Approve by Ops</button>
                        <button id="${modalButtonId}" class="modalBtn">View Notes</button>
                      </div>
                    </div>
                  </div>
                </div>
              `;

              const cardHTML = `
                <div style="width: 100%; margin: 20px auto; padding:12px;">
                  ${
                    workdrive_error ?
                      `<div class="alert alert-danger" role="alert">${workdrive_error}</div>`
                    : ""
                  }
                  <div class="card">
                    <div class="card-image">
                      ${imageSection}
                    </div>
                    ${contentSection}
                  </div>
                </div>
              `;

              return cardHTML;
            };

            container.innerHTML += generateCardHTML(
              workdrive_error,
              pdf,
              invoice_url,
              cv_data,
              vendor_contract_error,
              vendor_contract,
              buttonId,
              modalButtonId,
            );
          });

          container.addEventListener("click", async function (event) {
            if (event.target && event.target.id.startsWith("approve-btn-")) {
              if (event.target.dataset.clicked === "true") {
                return;
              }
              event.target.dataset.clicked = "true";

              const index = event.target.id.split("-")[2];

              const selectedItem = lists[index];
              const profileName = await getCurrentUserProfileName();
              const isDev = isDevUserProfile(profileName);
              const coiExpiredBeyond30Days = isVendorCoiExpired30Days(
                getCoiExpirationFromListItem(selectedItem),
              );

              if (isDev && coiExpiredBeyond30Days) {
                const contractName = getVendorContractNameFromListItem(selectedItem);
                const msg = `Contract name "${contractName}" was not approved, please check vendor COI expiration.`;

                if (!selectedItem?.cv_data?.id) {
                  event.target.dataset.clicked = "false";
                  showRejectPopup(msg);
                  return;
                }

                const btn = event.target;
                const prevLabel = btn.textContent;
                btn.disabled = true;
                btn.textContent = "Updating...";
                try {
                  await updateCvDataStatusValidation(selectedItem.cv_data, true);
                  if (selectedItem.cv_data) selectedItem.cv_data.Status_Validation = true;
                  showRejectPopup(msg, {
                    onOk: async () => {
                      await updateCvDataStatusValidation(selectedItem.cv_data, false);
                      if (selectedItem.cv_data) selectedItem.cv_data.Status_Validation = false;
                    },
                  });
                } catch (err) {
                  console.error("Status_Validation update:", err);
                  showRejectPopup(msg);
                  showError(err?.message || "Could not save. Please try again.");
                } finally {
                  btn.dataset.clicked = "false";
                  btn.textContent = prevLabel;
                  btn.disabled = false;
                }
                return;
              }
              changeStatusToApproved(selectedItem?.cv_data?.id, index);
            }

            if (event.target && event.target.id.startsWith("ai-btn-")) {
              if (event.target.dataset.clicked === "true") {
                return;
              }
              event.target.dataset.clicked = "true";

              let index = event.target.id.split("-")[2];
              let resultButtonId = `result-btn-${index}`;
              let aiButtonId = `ai-btn-${index}`;
              let resultButton = document.getElementById(resultButtonId);
              let aiButton = document.getElementById(aiButtonId);

              const selectedItem = lists[index];
              aiAnalyze(selectedItem, resultButton, aiButton).finally(() => {
                event.target.dataset.clicked = "false";
              });
            }
            if (event.target && event.target.id.startsWith("result-btn-")) {
              if (event.target.dataset.clicked === "true") {
                return;
              }
              event.target.dataset.clicked = "true";

              const index = event.target.id.split("-")[2];

              const selectedItem = lists[index];
              matchedResults(selectedItem).finally(() => {
                event.target.dataset.clicked = "false";
              });
            }
          });

          container.addEventListener("click", function (event) {
            if (event.target && event.target.id.startsWith("modal-btn-")) {
              if (event.target.dataset.clicked === "true") {
                return;
              }

              event.target.dataset.clicked = "true";

              const index = event.target.id.split("-")[2];
              const selectedItem = lists[index];

              showModal(
                selectedItem?.client_contract_error,
                selectedItem?.cv_data?.id,
                selectedItem?.vendor_contract?.id,
                selectedItem?.client_contract?.id,
                selectedItem?.cv_data?.Progress_Notes1,
                selectedItem?.client_contract?.Client_Addendum,
                selectedItem?.vendor_contract?.Vendor_Addendum,
              );

              const modal = document.querySelector(".modal");
              const closeModal = modal.querySelector(".close");
              const cancelBtnModal = modal.querySelector(".cancelBtn");

              closeModal.addEventListener("click", () => {
                event.target.dataset.clicked = "false";
              });
              cancelBtnModal.addEventListener("click", () => {
                event.target.dataset.clicked = "false";
              });
            }
          });
        } else {
          console.log("No records found.");
          showError("No records found to display.");
        }
      })
      .catch(function (error) {
        console.error("Error fetching data:", error);
        showError("Error fetching data. Please try again.");
      });
  }
  fetchData();

  function showModal(
    clientContractError,
    invoiceId,
    vendorContractId,
    clientContractId,
    progressNotes,
    clientAddendum,
    vendorAddendum,
  ) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "flex";
    modal.innerHTML = "";
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    const closeBtn = document.createElement("span");
    closeBtn.className = "close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = function () {
      modal.style.display = "none";
      modal.remove();
    };

    const createField = (labelText, textareaId, textareaValue) => {
      const fieldWrapper = document.createElement("div");
      fieldWrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
      `;

      const label = document.createElement("label");
      label.textContent = labelText;
      label.style.cssText = `
        font-size: 1rem;
        color: #555;
        flex: 1;
      `;

      const textarea = document.createElement("textarea");
      textarea.id = textareaId;
      textarea.value = textareaValue || "";
      textarea.style.cssText = `
        flex: 2;
        width: 100%;
        padding: 12px;
        font-size: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        resize: none;
        background-color: #f9f9f9;
        height: ${textareaValue && textareaValue.length > 50 ? "100px" : "50px"};
      `;

      fieldWrapper.appendChild(label);
      fieldWrapper.appendChild(textarea);
      return fieldWrapper;
    };

    const progressNotesElement = createField("Progress Notes", "progress-notes", progressNotes);
    const clientAddendumElement = createField("Client Addendum", "addendum-notes", clientAddendum);
    const vendorAddendumElement = createField("Vendor Addendum", "vendor-addendum", vendorAddendum);

    const buttonWrapper = document.createElement("div");
    buttonWrapper.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    `;

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.className = "cancelBtn";
    cancelButton.style.cssText = `
      padding: 10px 20px;
      background-color: #f5f5f5;
      color: #555;
      border: 1px solid #ccc;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s;
    `;
    cancelButton.onmouseover = () => {
      cancelButton.style.backgroundColor = "#e6e6e6";
    };
    cancelButton.onmouseout = () => {
      cancelButton.style.backgroundColor = "#f5f5f5";
    };
    cancelButton.onclick = function () {
      modal.style.display = "none";
      modal.remove();
    };

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save Changes";
    saveButton.style.cssText = `
      padding: 10px 20px;
      background-color: #6a0dad;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.3s;
    `;
    saveButton.onmouseover = () => {
      saveButton.style.backgroundColor = "#530b91";
    };
    saveButton.onmouseout = () => {
      saveButton.style.backgroundColor = "#6a0dad";
    };
    saveButton.onclick = function () {
      const updatedProgressNotes = document.getElementById("progress-notes")?.value || "";
      const updatedClientAddendum = document.getElementById("addendum-notes")?.value || "";
      const updatedVendorAddendum = document.getElementById("vendor-addendum")?.value || "";
      saveNotesToCRM(
        modal,
        invoiceId,
        vendorContractId,
        clientContractId,
        updatedProgressNotes,
        updatedClientAddendum,
        updatedVendorAddendum,
      );
      progressNotesElement.querySelector("textarea").value = updatedProgressNotes;
      clientAddendumElement.querySelector("textarea").value = updatedClientAddendum;
      vendorAddendumElement.querySelector("textarea").value = updatedVendorAddendum;
    };

    buttonWrapper.appendChild(cancelButton);
    buttonWrapper.appendChild(saveButton);

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(progressNotesElement);
    if (!clientContractId && clientContractError !== undefined) {
      const clientContractErrorElement = document.createElement("p");
      clientContractErrorElement.textContent = clientContractError;
      clientContractErrorElement.style.color = "red";
      modalContent.insertBefore(clientContractErrorElement, progressNotesElement);
    } else {
      modalContent.appendChild(clientAddendumElement);
    }
    modalContent.appendChild(vendorAddendumElement);
    modalContent.appendChild(buttonWrapper);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }

  function saveNotesToCRM(
    modal,
    invoiceId,
    vendorContractId,
    clientContractId,
    progressNotes,
    clientAddendum,
    vendorAddendum,
  ) {
    const reqData = {
      arguments: JSON.stringify({
        invoice_id: invoiceId,
        vendor_contract_id: vendorContractId,
        client_contract_id: clientContractId,
        progress_notes: progressNotes,
        client_addendum: clientAddendum,
        vendor_addendum: vendorAddendum,
      }),
    };

    ZOHO.CRM.FUNCTIONS.execute("save_addendum_contract_invoice", reqData)
      .then((response) => {
        console.log("Notes saved successfully:", response);
        // fetchData();
        showSuccess("Notes saved successfully.");
        modal.style.display = "none";
        modal.remove();
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error saving notes:", error);
        showError("Error saving notes. Please try again.");
      });
  }

  function changeStatusToApproved(invoiceId, index) {
    const buttonId = `approve-btn-${index}`;
    const button = document.getElementById(buttonId);
    button.textContent = "Approving...";
    button.style.backgroundColor = "#d1d1d1";
    button.disabled = true;
    console.log("Approving invoice ID:", invoiceId);

    const reqData = {
      arguments: JSON.stringify({
        id: invoiceId,
        status: "Approved by Ops",
      }),
    };

    ZOHO.CRM.FUNCTIONS.execute("approved_vendor_invoices", reqData)
      .then((response) => {
        console.log("Status updated successfully:", response);
        fetchData();
        showSuccess("Invoice approved successfully.");
      })
      .catch((error) => {
        console.error("Error during API call:", error);
        showError("Error approving the invoice. Please try again.");
      });
  }
});
ZOHO.embeddedApp.init();

async function aiAnalyze(selectedItem, resultButton, aiButton) {
  try {
    aiButton.innerHTML = "Analyzing...";
    aiButton.disabled = true;
    const invoice_url = selectedItem.invoice_url;

    // Extract the WorkDrive ID
    const extractId = invoice_url.substring(invoice_url.lastIndexOf("/") + 1);
    console.log("WorkDrive File ID:", extractId);

    const reqData = {
      arguments: JSON.stringify({
        url: invoice_url,
        isAIResponse: true,
      }),
    };
    let imageResponse = await ZOHO.CRM.FUNCTIONS.execute("ConvertURLToFIle", reqData);
    let output = JSON.parse(imageResponse.details.output);
    let image = output?.image;
    let text = output?.text;
    console.log("Image URL: ", image);
    console.log(text);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Here is the extracted invoice text:\n\n${text}\n\nFrom this text:
1. Extract all dollar amount(s) as potential rates.
2. Given the following list of services from the vendor contract:
${JSON.stringify(selectedItem.vendor_contract?.Our_Services_SubForm)}

Each service includes a service name and a vendor price. For each service, respond with:
- serviceName: as-is from the contract
- matched: true if both (a) the **service name** is clearly mentioned in the invoice **OR** semantically implies the same thing, **AND** (b) the **vendor price** is found among the extracted rates in the invoice.
- matched: false if either the name or the rate do not match.

Return the response strictly as a JSON array of objects like this:
[
  { "serviceName": "SERVICE_NAME", "matched": true/false },
  ...
]
Do NOT include any explanation or additional text.
`,
          },
        ],
      }),
    });
    if (response.status !== 200) {
      showError("Error:", response.statusText);
      resultButton.style.display = "none";
      aiButton.innerHTML = "Compare with AI";
      aiButton.disabled = false;
      return;
    }

    const data = await response.json();
    const content = data?.choices[0]?.message?.content;
    console.log("AI Response:", content);
    resultButton.style.display = "block";

    // Parse the AI response to extract the array
    try {
      const matchStart = content.indexOf("[");
      const matchEnd = content.lastIndexOf("]") + 1;
      const jsonString = content.substring(matchStart, matchEnd);
      console.log("JSON String:", jsonString);

      selectedItem.parsedData = JSON.parse(jsonString);
      aiButton.innerHTML = "Compare with AI";
      aiButton.disabled = false;
    } catch (error) {
      console.error("Error parsing AI response:", error);
      showError("Failed to parse AI response. Please try again.");
      aiButton.innerHTML = "Compare with AI";
      aiButton.disabled = false;
      return;
    }
  } catch (error) {
    console.log(error);
    aiButton.innerHTML = "Compare with AI";
    aiButton.disabled = false;
  }
}
async function matchedResults(selectedItem) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "flex";
  const existingModal = document.querySelector(".modal");
  if (existingModal) {
    return; // Don't open another modal
  }
  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";

  const closeBtn = document.createElement("span");
  closeBtn.className = "close";
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = function () {
    modal.style.display = "none";
    modal.remove();
  };

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Service Name", "Matched"].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.border = "1px solid #ddd";
    th.style.padding = "8px";
    th.style.textAlign = "left";
    th.style.backgroundColor = "#f2f2f2";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const dataToUse = selectedItem.parsedData || [];

  dataToUse.forEach((item) => {
    const row = document.createElement("tr");

    const serviceNameCell = document.createElement("td");
    serviceNameCell.textContent = item.serviceName || "N/A";
    serviceNameCell.style.border = "1px solid #ddd";
    serviceNameCell.style.padding = "8px";

    const matchedCell = document.createElement("td");
    matchedCell.textContent = item.matched ? "Yes" : "No";
    matchedCell.style.border = "1px solid #ddd";
    matchedCell.style.padding = "8px";

    row.appendChild(serviceNameCell);
    row.appendChild(matchedCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(table);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

async function fetchImageAsBlob(url) {
  const response = await fetch(url, { mode: "cors" });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
async function runOCR(imageUrl) {
  try {
    const blobUrl = await fetchImageAsBlob(imageUrl);
    const result = await Tesseract.recognize(blobUrl, "eng", {
      logger: (m) => console.log(m),
    });
    console.log("Extracted Text:", result.data.text);
  } catch (err) {
    console.error("Tesseract Error:", err);
  }
}

function createLoadingSpinner() {
  const loadingIndicator = document.createElement("div");
  loadingIndicator.classList.add("spinLoad", "spinner-container");

  const spinner = document.createElement("div");
  spinner.classList.add("spinner-border", "text-primary");
  spinner.setAttribute("role", "status");

  const spinnerText = document.createElement("span");
  spinnerText.classList.add("visually-hidden");
  spinnerText.textContent = "Loading... Please wait.";
  spinner.appendChild(spinnerText);
  loadingIndicator.appendChild(spinner);
  return loadingIndicator;
}
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

/**
 * @param {string} message
 * @param {{ onOk?: () => void | Promise<void> }} [options] — If `onOk` is set, it runs when the user clicks OK (before the modal closes).
 */
function showRejectPopup(message, options) {
  const onOk = options && typeof options.onOk === "function" ? options.onOk : null;

  const existing = document.querySelector(".modal.coi-reject-modal");
  if (existing) {
    existing.remove();
  }
  const bodyText = message.replace(/^Approval Reject:\s*/i, "").trim() || message;

  const modal = document.createElement("div");
  modal.className = "modal coi-reject-modal";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.padding = "16px";

  const removeModal = () => {
    modal.style.display = "none";
    modal.remove();
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal) removeModal();
  });

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";
  modalContent.style.padding = "28px 28px 22px";
  modalContent.style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.15)";
  modalContent.style.borderTop = "4px solid #007bff";
  modalContent.style.maxWidth = "420px";
  modalContent.style.width = "100%";
  modalContent.addEventListener("click", (e) => e.stopPropagation());

  const closeBtn = document.createElement("span");
  closeBtn.className = "close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.onclick = removeModal;

  const title = document.createElement("h4");
  title.textContent = "Approval rejected";
  title.style.margin = "0 0 12px";
  title.style.paddingRight = "28px";
  title.style.fontSize = "1.15rem";
  title.style.fontWeight = "600";
  title.style.color = "#1a202c";

  const p = document.createElement("p");
  p.textContent = bodyText;
  p.style.margin = "0 0 24px";
  p.style.lineHeight = "1.55";
  p.style.fontSize = "0.95rem";
  p.style.color = "#4a5568";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  footer.style.gap = "10px";

  const ok = document.createElement("button");
  ok.type = "button";
  ok.textContent = "OK";
  ok.style.cssText =
    "padding:10px 24px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.95rem;box-shadow:0 1px 2px rgba(0,0,0,0.08);transition:background 0.15s ease;";
  ok.onmouseenter = () => {
    if (!ok.disabled) ok.style.background = "#0069d9";
  };
  ok.onmouseleave = () => {
    if (!ok.disabled) ok.style.background = "#007bff";
  };
  ok.onclick = async () => {
    if (onOk) {
      ok.disabled = true;
      ok.textContent = "Saving...";
      ok.style.cursor = "wait";
      ok.style.opacity = "0.85";
      try {
        await onOk();
      } catch (err) {
        console.error("onOk (Status_Validation revert):", err);
        showError(err?.message || "Could not save. Please try again.");
        ok.disabled = false;
        ok.textContent = "OK";
        ok.style.cursor = "pointer";
        ok.style.opacity = "1";
        return;
      }
    }
    removeModal();
  };

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(title);
  modalContent.appendChild(p);
  footer.appendChild(ok);
  modalContent.appendChild(footer);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

document.addEventListener("mouseover", function (e) {
  if (e.target.classList.contains("tooltip-trigger")) {
    const tooltip = e.target.nextElementSibling;

    // Check if the next sibling is the custom-tooltip
    if (!tooltip || !tooltip.classList.contains("custom-tooltip")) return;

    const site = e.target.dataset.site || "N/A";
    const address = e.target.dataset.address || "N/A";
    const city = e.target.dataset.city || "N/A";
    const state = e.target.dataset.state || "N/A";
    const zip = e.target.dataset.zip || "N/A";

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Contract Site Details</div>
      <small>
        <strong>Site:</strong> ${site}<br/>
        <strong>Address:</strong> ${address}<br/>
        <strong>City:</strong> ${city}<br/>
        <strong>State:</strong> ${state}<br/>
        <strong>Zip:</strong> ${zip}
      </small>
    `;

    tooltip.style.display = "block";

    // Position tooltip
    const rect = e.target.getBoundingClientRect();
    // Position to the left of the element
    tooltip.style.left = rect.left + "px";
    tooltip.style.top = rect.bottom + 10 + "px"; // 10px below the link

    // Add animation class after position is set
    setTimeout(() => {
      tooltip.style.opacity = "1";
      tooltip.style.transform = "translateY(-5px)";
    }, 10);
  }
});

document.addEventListener("mouseout", function (e) {
  if (e.target.classList.contains("tooltip-trigger")) {
    const tooltip = e.target.nextElementSibling;

    // Check if the next sibling is the custom-tooltip
    if (!tooltip || !tooltip.classList.contains("custom-tooltip")) return;

    // Apply reverse transition effect
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(0)";

    // Hide after transition
    setTimeout(() => {
      tooltip.style.display = "none";
    }, 200); // Must match CSS transition time (0.2s)
  }
});
