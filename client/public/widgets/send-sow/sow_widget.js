function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
let fields = [
  { key: "OurServices.name", label: "OurServices", class: "service-name" },
  { key: "Start_Date", label: "Start Date", class: "start-date" },
  { key: "End_Date", label: "EndDate", class: "end-date" },
  {
    key: "Number_of_Services",
    label: "Number Of Services",
    class: "service-count",
  },
  {
    key: "Number_of_Managed_Locations",
    label: "Number Of Managed Locations",
    class: "managed-locations",
  },
  {
    key: "Number_of_Locations_Awarded",
    label: "Number of Locations Awarded",
    class: "locations-awarded",
  },
  { key: "Site_Open_Time", label: "Site Open Time", class: "open-time" },
  {
    key: "Snow_Removal_Salt_Ares_Inclusions",
    label: "Snow Removal/Salt Areas Inclusions",
    class: "salt-areas",
  },
  {
    key: "Salt_Billing_Frequency_and_Type",
    label: "Salt Billing Frequency and Type",
    class: "billing-frequency",
  },
  { key: "Trigger_Point", label: "Trigger Point", class: "trigger-point" },
  { key: "Description", label: "Description", class: "description" },
  {
    key: "Number_of_Shrub_Trimming_Servi",
    label: "Number of Shrub Trimming Servi",
    class: "shrub-trimming-count",
  },
  {
    key: "Number_of_Fertilizer_Applicati",
    label: "Number of Fertilizer Application",
    class: "fertilizer-applications",
  },
];
let attachmentFiles = [];
let sow_data;

let emailDescription;
ZOHO.embeddedApp.on("PageLoad", function (entity) {
  const entityIdNumber = entity.EntityId[0];
  const req_data = {
    arguments: JSON.stringify({
      record_id: entityIdNumber,
    }),
  };
  document.getElementById("sowAttachment").addEventListener("change", function () {
    handleFileChange("sowAttachment", "fileList");
  });
  document.getElementById("siteMap").addEventListener("change", function () {
    handleFileChange("siteMap", "siteMapList");
  });
  function handleFileChange(fileId, listId) {
    const fileInput = document.getElementById(fileId);
    const fileList = document.getElementById(listId);
    const files = fileInput.files;

    Array.from(files).forEach((file) => {
      var config = {
        CONTENT_TYPE: "multipart",
        PARTS: [
          {
            headers: {
              "Content-Disposition": "file;",
            },
            content: "_FILE_",
          },
        ],
        FILE: {
          fileParam: "content",
          file: file,
        },
      };
      ZOHO.CRM.API.uploadFile(config)
        .then((data) => {
          const fileData = data.data[0].details;
          attachmentFiles.push(fileData);
          console.log(fileData);
        })
        .catch((ERR) => console.log(ERR));

      const li = document.createElement("li");
      const fileName = document.createElement("span");
      fileName.textContent = file.name;
      fileName.title = "View File";

      li.appendChild(fileName);
      fileList.appendChild(li);

      console.log(attachmentFiles);
    });
  }
  const toolbarOptions = [
    ["bold", "italic", "underline"],
    [{ font: [] }],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["link"],
    [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  ];

  const quill = new Quill("#emailDescription", {
    modules: { toolbar: toolbarOptions },
    theme: "snow",
  });
  quill.on("text-change", function () {
    const content = quill.root.innerHTML;
    emailDescription = content;
  });

  const vendorFieldsContainer = document.getElementById("vendorFieldsContainer");
  const mainContainer = document.getElementById("container");
  const formContainer = document.getElementById("sowForm");
  document.getElementById("winterNotes").style.display = "none";
  document.getElementById("summerNotes").style.display = "none";
  const winterNotesChild = document.querySelector("#winterNotes .notes");
  const summerNotesChild = document.querySelector("#summerNotes .notes");
  const spinner = document.getElementById("spinner");
  const buttonText = document.getElementById("buttonText");

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

  // Function to populate form with response data
  function populateForm(response) {
    if (response.Winter_Specific_Vendor_Notes !== null) {
      document.getElementById("winterNotes").style.display = "block";
      winterNotesChild.innerHTML = response.Winter_Specific_Vendor_Notes;
    }
    if (response.Summer_Specific_Vendor_Notes !== null) {
      document.getElementById("summerNotes").style.display = "block";
      summerNotesChild.innerHTML = response.Summer_Specific_Vendor_Notes;
    }
    console.log(response.SOWID);

    document.getElementById("sowNumber").value = response.SOWID || "";
    document.getElementById("siteNumber").value = response.Company_Name?.name || "";
    document.getElementById("companyName").value = response?.Account_Name?.name || "";

    // const vendorDetails = response.Sourcing_Overview_Details || [];

    // vendorDetails.forEach((detail, index) => {
    //   const vendorField = createVendorField(detail, index);
    //   vendorFieldsContainer.appendChild(vendorField);

    //   // Set values for each vendor field
    //   document.getElementById(`vendorSelection${index + 1}`).value = "";
    //   document.getElementById(`vendorEmail${index + 1}`).value = "";
    // });

    document.getElementById("city").value = response?.Site_City || "";
    console.log(response?.Site_City);

    document.getElementById("state").value = response?.Site_State || "";
    console.log(response?.Site_State);

    document.getElementById("streetAddress").value = response?.Site_Street || "";
    console.log(response?.Site_Street);

    document.getElementById("zipCode").value = response?.Site_ZIP || "";
    console.log(response?.Site_ZIP);
  }

  function populateScopeOfWork(scopeOfWorkArray) {
    const sowTableBody = document.getElementById("sowTableBody");
    const sowTableHead = document.getElementById("sowTableHead");
    sowTableBody.innerHTML = "";
    sowTableHead.innerHTML = "";

    const nonNullFields = fields.filter(({ key }) =>
      scopeOfWorkArray.some(
        (workItem) => key.split(".").reduce((obj, prop) => obj?.[prop], workItem) !== null,
      ),
    );

    const tableHeaders = nonNullFields
      .map(({ label, class: className }) => `<th class="${className}">${label}</th>`)
      .join("");

    sowTableHead.innerHTML = `<tr>${tableHeaders}</tr>`;

    const scopeOfWorkRows = scopeOfWorkArray
      .map((workItem) => {
        const row = nonNullFields
          .map(({ key }) => {
            let value = key.split(".").reduce((obj, prop) => obj && obj[prop], workItem);

            if (key === "Start_Date" || key === "End_Date") {
              value = formatDate(value);
            }

            return value ?
                `<td><input type="text" class="table-input" readonly value="${value}" /></td>`
              : "<td>-</td>";
          })
          .filter((td) => td !== "")
          .join("");
        return row ? `<tr>${row}</tr>` : "";
      })
      .join("");
    sowTableBody.innerHTML = scopeOfWorkRows;
  }

  let vendors = [];
  let selectedVendors = [];
  $("#e1")
    .select2({
      width: "100%",
      allowClear: true,
      multiple: true,
      maximumSelectionSize: 1,
      placeholder: "Search Vendors",
      language: {
        searching: function () {
          return "Searching for Vendors...";
        },
        noResults: function () {
          return "No vendors found";
        },
        inputTooShort: function () {
          return "Type at least one character...";
        },
      },
      ajax: {
        url: "",
        transport: debounce(function (params, success, failure) {
          console.log(params);
          let searchValue = params.data.term?.trim();

          // Check if searchValue is not empty
          if (searchValue && searchValue.length > 0) {
            let req_vendor_data = {
              arguments: JSON.stringify({ vendor_name: searchValue }),
            };

            ZOHO.CRM.FUNCTIONS.execute("search_all_vendors", req_vendor_data)
              .then((data) => {
                console.log(data);

                if (!data || !data.details || !data.details.output) {
                  console.error("Invalid API Response", data);
                  return failure();
                }

                const response = JSON.parse(data.details.output);
                vendors = response.vendors || [];
                console.log("vendors fetched: ", vendors);
                let results = vendors.map((vendor) => ({
                  id: vendor.id,
                  vendorName: vendor.Vendor_Name,
                  email: vendor.Email,
                  text: vendor.Vendor_Name,
                }));

                success({ results });
                params.data.term = "";
              })
              .catch((err) => {
                console.error("Error fetching vendors:", err);
                failure();
              });
          }
        }, 500),
        processResults: function (data) {
          return { results: data.results || [] };
        },
      },
      templateResult: function (data) {
        if (!data.vendorName) return data.text;

        return $(`
        <div class="select2-vendor-item">
          <div>${data.vendorName}</div>
          <div style="font-size: 12px;">${data.email}</div>
        </div>
      `);
      },
    })
    .on("select2:select", function () {
      $(this).select2("close");
      $(".select2-results__options").empty();
      $(this).val($(this).val()).trigger("change");
      updateSelectedVendors();
      displaySelectedVendors();
    })
    .on("select2:unselect", function () {
      updateSelectedVendors();
      displaySelectedVendors();
    });

  $("#e1").on("select2:open", function () {
    let searchInput = $(".select2-search__field");
    if (searchInput.val().trim() === "") {
      $(".select2-results__options").empty();
    }
  });
  function displaySelectedVendors() {
    const selectedVendorsContainer = document.getElementById("selectedVendorsContainer");
    selectedVendorsContainer.innerHTML = "";

    selectedVendors.forEach((vendor) => {
      const vendorRow = document.createElement("div");
      vendorRow.classList.add("vendor-row");

      const vendorName = document.createElement("span");
      vendorName.classList.add("vendor-name");
      vendorName.textContent = vendor.name;

      const vendorEmail = document.createElement("span");
      vendorEmail.classList.add("vendor-email");
      vendorEmail.innerHTML = `<span style="color: gray;">Email:</span> ${vendor.email}`;

      vendorRow.appendChild(vendorName);
      vendorRow.appendChild(vendorEmail);
      selectedVendorsContainer.appendChild(vendorRow);
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  $("#checkbox").click(function () {
    if ($("#checkbox").is(":checked")) {
      $("#e1 > option").prop("selected", "selected");
      $("#e1").trigger("change");
    } else {
      $("#e1 > option").removeAttr("selected");
      $("#e1").trigger("change");
    }
  });

  function updateSelectedVendors() {
    const selectedOptions = $("#e1").select2("data");
    selectedVendors = selectedOptions.map((option) => {
      return {
        id: option.id || null,
        email: option.email || null,
        name: option.text || null,
      };
    });
    console.log("Selected Vendors:", selectedVendors);
  }

  const loadingIndicator = createLoadingSpinner();
  mainContainer.appendChild(loadingIndicator);
  formContainer.style.display = "none";

  // Make API call to fetch SOW details
  ZOHO.CRM.FUNCTIONS.execute("get_sow_details", req_data)
    .then((data) => {
      const output = data.details.output;
      const response = JSON.parse(output);
      if (response.Vendor_Specific_Attachments) {
        console.log(response.Vendor_Specific_Attachments);

        const fileList = document.getElementById("fileList");
        const li = document.createElement("li");
        const fileName = document.createElement("span");
        fileName.textContent = response.Vendor_Specific_Attachments[0].file_Name;

        li.appendChild(fileName);
        fileList.appendChild(li);
        const id = response?.Vendor_Specific_Attachments[0].file_Id;
        attachmentFiles.push({ id });
      }

      if (response?.Company_Name) {
        ZOHO.CRM.API.getRecord({
          Entity: "Accounts",
          RecordID: response?.Company_Name.id,
        })
          .then((res) => {
            console.log(res.data);
            const fileList = document.getElementById("siteMapList");
            const li = document.createElement("li");
            const fileName = document.createElement("span");
            fileName.textContent = res?.data[0]?.Site_Map_Attachment[0]?.file_Name;

            li.appendChild(fileName);
            fileList.appendChild(li);
            const id = res?.data[0]?.Site_Map_Attachment[0].file_Id;
            attachmentFiles.push({ id });
            // handleFileChange("siteMap", response.Site_Map);
          })
          .catch((err) => console.error("Error fetching Account details:", err));
      }

      sow_data = response;
      if (response.Scope_of_Work && Array.isArray(response.Scope_of_Work)) {
        populateScopeOfWork(response.Scope_of_Work);
      }

      loadingIndicator.style.display = "none";
      formContainer.style.display = "flex";
      console.log(response);

      populateForm(response);
    })
    .catch((err) => {
      console.error("Error fetching SOW details:", err);
      loadingIndicator.style.display = "none";
    });

  formContainer.addEventListener("submit", function (e) {
    e.preventDefault();
    spinner.style.display = "inline-block";
    buttonText.style.display = "none";

    if (selectedVendors.length === 0) {
      showError("Please select vendors to send email");
      spinner.style.display = "none";
      buttonText.style.display = "inline-block";
      return;
    }

    const emailData = {
      arguments: JSON.stringify({
        record_id: entityIdNumber,
        subject: sow_data.Company_Name?.name || "OlioGroup",
        messageBody: emailTemplate(sow_data),
        vendors: { all_vendors: selectedVendors },
        attachment_new: {
          vendorAttachments: attachmentFiles,
        },
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        zipCode: document.getElementById("zipCode").value,
        streetAddress: document.getElementById("streetAddress").value,
      }),
    };
    ZOHO.CRM.FUNCTIONS.execute("sendSOWEmailToVendors", emailData)
      .then((data) => {
        console.log(data);
        showSuccess("Sended email to vendors");
        spinner.style.display = "none";
        buttonText.style.display = "inline-block";
        ZOHO.CRM.UI.Popup.closeReload()
          .then((data) => console.log("Zoho Popup closed:", data))
          .catch((error) => console.error("Error closing Zoho Popup:", error));
      })
      .catch((err) => {
        showError(err?.code || "Invalid error");
        spinner.style.display = "none";
        buttonText.style.display = "inline-block";
        console.error("Error fetching SOW details:", err);
      });
  });
});

ZOHO.embeddedApp.init();

function emailTemplate(emailData) {
  const dynamicLink = `https://portal.oliogroupmn.com/app/bid.html?sowID=${emailData.id}&bidID=bidId
`;
  return `
<html>
    <body>
        <h2>OlioGroup Bid Request</h2>
        ${emailDescription ? `<p style="margin:12px 0;font-weight:bold;">Notes To Vendor Bidding:</p>` : ""}
        ${emailDescription ? `<p style="margin:12px 0;">${emailDescription}</p>` : ""}
        <p style="margin:12px 0;">You have been invited to submit a bid for the following project:</p>
        <p style="margin:6px 0;"><span style="font-weight:bold;">Site Number:</span> ${emailData?.Company_Name?.name || "-"}</p>
        <p style="margin:6px 0;"><span style="font-weight:bold;">Company Name:</span> ${emailData?.Account_Name?.name || "-"}</p>
        <p style="margin:6px 0;"><span style="font-weight:bold;">Street Address:</span> ${document.getElementById("streetAddress").value || "-"}</p>
        <p style="margin:6px 0;"><span style="font-weight:bold;">ZIP Code:</span> ${document.getElementById("zipCode").value || "-"}</p>
        <p style="margin:6px 0;"><span style="font-weight:bold;">City:</span> ${document.getElementById("city").value || "-"}</p>
        <p style="margin:6px 0;"><span style="font-weight:bold;">State:</span> ${document.getElementById("state").value || "-"}</p>
        <p>There are a few files for you to consider in the bid scope (attached). We've also added a Site Map. </p>
        <a href="${dynamicLink}" target="_blank">Click here to submit your bid</a>
        <p style="margin-top:7px;">Best regards,</p>
        <p>Olio Team</p>
    </body>
</html>
  `;
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
