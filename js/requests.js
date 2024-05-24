async function getShipments(params) {
    let requestOptions = {
        method: 'POST',
        headers: {
            "Accept": 'application/json',
            'Content-Type': 'application/json',
            'Fk-Csrf-Token': params.csrfToken,
            'X-Location-Id': params.location
        },
        body: JSON.stringify(params.requestParams),
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'include'
    };
    return fetch(`https://seller.flipkart.com/napi/my-orders/fetch?sellerId=${params.sellerId}`, requestOptions)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                if (response.status == 500) {
                    return { "resend": true };
                }
                else {
                    return response.json();
                }
            }
        })
        .then(result => {
            if (typeof result == "object" && result.error == undefined && result.items && result.items.length) {
                return result;
            } else {
                if (result.resend == true) {
                    if (!((window.failedGetShipments ?? 0) > 10)) {
                        window.failedGetShipments = (window.failedGetShipments ?? 0) + 1;
                        return getShipments(params);
                    } else {
                        return {};
                    }
                } else {
                    return {};
                }
            }
        })
        .catch(error => { console.log(error); return {}; });
}
async function getShipmentIds(params) {
    let batchSize = 100;
    let sampleParams = {
        "status": "",
        "payload": {
            "pagination": {
                "page_num": 1,
                "page_size": batchSize
            },
            "params": {
                "seller_id": params.sellerId
            }
        },
        "sellerId": params.sellerId
    }
    let states = [];
    let statesElem = document.querySelectorAll('[name="shipment-states"]:checked');
    if (statesElem.length) {
        statesElem.forEach(item => states.push(item.value));
    } else {
        alert("No Shipment State is Selected!! Please Select Shipment State.");
        return { "single_shipments": [], 'multiple_shipments': [] };
    }
    let requestParams, state, shipments, shipmentCollection = [], nextShipments, loopCount, i, k;
    for (i = 0; i < states.length; i++) {
        state = states[i];
        requestParams = sampleParams;
        requestParams.status = state;
        if (state == "shipments_to_handover") {
            if (!params.deliveryVendors.length) {
                continue;
            } else {
                requestParams.payload.params.vendor_group_codes = params.deliveryVendors;
            }
        }
        shipments = await getShipments({ requestParams: requestParams, sellerId: params.sellerId, location: params.location, csrfToken: params.csrfToken });
        if (shipments.items && shipments.items.length) {
            shipmentCollection = [...shipmentCollection, ...shipments.items];
            let totalShipments = parseInt(shipments.total ?? 0);
            if (totalShipments > batchSize) {
                loopCount = Math.ceil((totalShipments - batchSize) / batchSize)
                for (k = 0; k < loopCount; k++) {
                    requestParams = sampleParams;
                    requestParams.payload.pagination.page_num = k + 2;
                    nextShipments = await getShipments({ requestParams: requestParams, sellerId: params.sellerId });
                    if (nextShipments.items && nextShipments.items.length) {
                        shipmentCollection = [...shipmentCollection, ...nextShipments.items];
                    }
                }
            }
        }
    }
    if (shipmentCollection.length) {
        return parseShipments(shipmentCollection);
    } else {
        return { "single_shipments": [], 'multiple_shipments': [] };
    }
}
function parseShipments(shipmentsArray) {
    let singleShipments = [];
    let multiShipments = [];
    shipmentsArray.forEach((shipment) => {
        if (shipment.order_items.length > 1 || (shipment.order_items.length == 1 && parseInt(shipment.order_items[0].quantity) > 1)) {
            multiShipments.push(shipment.id);
        } else {
            singleShipments.push({ id: shipment.id, sku: shipment.order_items[0].sku });
        }
    });
    singleShipments.sort((a, b) => ((a.sku.toLowerCase() > b.sku.toLowerCase()) ? 1 : -1));
    let finalSingleShipments = singleShipments.map((item) => { return item.id });
    return { "single_shipments": finalSingleShipments, 'multiple_shipments': multiShipments };
}
async function getPdf(params) {
    let requestOptions = {
        method: 'GET',
        headers: {
            'Fk-Csrf-Token': params.csrfToken,
            'X-Location-Id': params.location
        },
        mode: 'cors',
        cache: "no-cache",
        credentials: 'include'
    };
    return fetch(`https://seller.flipkart.com/napi/my-orders/reprint_labels?shipmentIds=${params.ids.toString()}&useNewTemplate=true&locationId=${params.location}&sellerId=${params.sellerId}`, requestOptions)
        .then(response => {
            if (response.ok) {
                return response.arrayBuffer();
            } else {
                if (response.status == 500) {
                    return { "resend": true };
                } else if (response.status == 429) {
                    return { "resend": true };
                }
                else {
                    return new ArrayBuffer();
                }
            }
        })
        .then(result => {
            if (result.resend == true) {
                return getPdf(params);
            } else {
                window.totalDownloadedPDFs++;
                window.dispatchEvent(new CustomEvent('update-loader', {
                    detail: {
                        percentage: (window.totalDownloadedPDFs * 100) / (window.totalPDFs),
                        loaderElem: document.querySelector('.pdf-download-progress .bar'),
                        percentageElem: document.querySelector('.pdf-download-progress .bar span')
                    }
                }));
                return result;
            }
        })
        .catch(e => { console.log('error', e); window.totalDownloadedPDFs++; return new ArrayBuffer() });
}
function downloadToBrowser(file, filename, type) {
    const link = document.createElement('a');
    link.download = filename;
    let binaryData = [];
    binaryData.push(file);
    link.href = URL.createObjectURL(new Blob(binaryData, { type: type }))
    link.click();
}
async function getSellerId() {
    var requestOptions = {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'include'
    };
    return fetch("https://seller.flipkart.com/getFeaturesForSeller", requestOptions)
        .then(response => {
            if (response.status != 200) {
                return {};
            }
            else {
                return response.json();
            }
        })
        .then(result => {
            return result.sellerId ?? false;
        })
        .catch(error => { console.log("Error While Getting Seller ID : " + error); return false; });
}
async function getCSRFToken() {
    return fetch('https://seller.flipkart.com/index.html')
        .then(r => r.text())
        .then(r => {
            let doc = new DOMParser().parseFromString(r, 'text/html');
            return doc.querySelector('#seller_session_unique_token').value;
        });
}
async function getLocations() {
    return fetch('https://seller.flipkart.com/napi/get-locations?locationType=pickup&include=state').then(r => r.json()).then(r => { return r.result.multiLocationList })
}
async function getDeliveryVendors() {
    let location = document.querySelector('#location').value;
    let CSRFToken = await getCSRFToken().catch(error => { }) ?? "";
    if (location.trim() != "" && CSRFToken.trim() != "") {
        let requestOptions = {
            method: 'GET',
            headers: {
                'Fk-Csrf-Token': CSRFToken,
                'X-Location-Id': location
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'include'
        };
        return fetch(`https://seller.flipkart.com/napi/orders/getHandoverCounts?sellerId=${await getSellerId()}`, requestOptions).then(r => r.json()).then(r => { return r.buckets })
    } else {
        return [];
    }

}