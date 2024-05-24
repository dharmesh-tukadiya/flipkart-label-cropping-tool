async function process() {

    try {
        resetLoggers();
        let location = document.querySelector('#location').value;
        if (location.trim() == "") {
            alert('Please Select Location/WareHouse!!');
            return;
        }
        let CSRFToken = await getCSRFToken().catch(error => {
            document.querySelector('.gathering-shipments-log').innerHTML = document.querySelector('.gathering-shipments-log').innerHTML + "<br>Unknown Error Occured!!" + error;
        }) ?? "";
        if (CSRFToken.trim().value == "") {
            document.querySelector('.gathering-shipments-log').innerHTML = document.querySelector('.gathering-shipments-log').innerHTML + "<br>Please Login To <a href='https://seller.flipkart.com' target='_blank'>Seller Dashboard<a>. & Download Again!!";
        }
        document.querySelector('.gathering-shipments-log').innerHTML = "Reading Labels...";
        let sellerId = await getSellerId().catch(error => {
            document.querySelector('.gathering-shipments-log').innerHTML = document.querySelector('.gathering-shipments-log').innerHTML + "<br>Error Occured While Sending Request To Get Seller ID!!" + error;
        }) ?? false;
        if (typeof sellerId != 'string' || sellerId.trim().length == 0) {
            document.querySelector('.gathering-shipments-log').innerHTML = document.querySelector('.gathering-shipments-log').innerHTML + "<br>Seller Id can not be empty!!";
            return;
        }

        let shipmentIds = await getShipmentIds({ sellerId: sellerId, location: location, csrfToken: CSRFToken, deliveryVendors: Array.from(document.querySelector('#delivery_vendors').selectedOptions).map(item => item.value) }).catch(error => {
            document.querySelector('.gathering-shipments-log').innerHTML = document.querySelector('.gathering-shipments-log').innerHTML + "<br>Error While Reading Labels!! " + error;
        }) ?? false;
        if (shipmentIds == false) {
            return;
        }
        let downloadingType = document.querySelector('[name=download-mode]:checked') ? document.querySelector('[name=download-mode]:checked').value : null;
        switch (downloadingType) {
            case 'single-multi-merged':
                if (!shipmentIds['single_shipments'].length) {
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Single Item Shipments Not Found";
                }
                if (!shipmentIds['multiple_shipments'].length) {
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Multi Item Shipments Not Found";
                }
                if (!(!shipmentIds['single_shipments'].length && !shipmentIds['multiple_shipments'].length)) {
                    generatePDF({ sellerId: sellerId, location: location, ids: [...shipmentIds['single_shipments'], ...shipmentIds['multiple_shipments']], name: 'single-multi-merged' });
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Single Shipments : " + shipmentIds['single_shipments'].length + "   Multi Shipments : " + shipmentIds['multiple_shipments'].length;
                }
                break;
            case 'single-multi-separated':
                if (!shipmentIds['single_shipments'].length) {
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Single Item Shipments Not Found";
                }
                else {
                    generatePDF({ sellerId: sellerId, location: location, ids: shipmentIds['single_shipments'], name: 'single' });
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Single Shipments : " + shipmentIds['single_shipments'].length;
                }
                if (!shipmentIds['multiple_shipments'].length) {
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Multi Item Shipments Not Found";
                }
                else {
                    generatePDF({ sellerId: sellerId, location: location, ids: shipmentIds['multiple_shipments'], name: 'multi' });
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Single Shipments : " + shipmentIds['multiple_shipments'].length;
                }
                break;
            case 'single-only':
                if (!shipmentIds['single_shipments'].length) {
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Single Item Shipments Not Found";
                }
                else {
                    generatePDF({ sellerId: sellerId, location: location, ids: shipmentIds['single_shipments'], name: 'single' });
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Single Shipments : " + shipmentIds['single_shipments'].length;
                }
                break;
            case 'multi-only':
                if (!shipmentIds['multiple_shipments'].length) {
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Multi Item Shipments Not Found";
                }
                else {
                    generatePDF({ sellerId: sellerId, location: location, ids: shipmentIds['multiple_shipments'], name: 'multi' });
                    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Single Shipments : " + shipmentIds['multiple_shipments'].length;
                }
                break;
            default:
                generatePDF({ sellerId: sellerId, location: location, ids: [...shipmentIds['single_shipments'], ...shipmentIds['multiple_shipments']], name: 'single-multi-merged' });
                document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Single Shipments : " + shipmentIds['single_shipments'].length + "   Multi Shipments : " + shipmentIds['multiple_shipments'].length;
                break;
        }
    } catch (error) {
        document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br>Fatal Error Occurred!!!!<br>" + error;
        alert('Error Occurred!!');
        window.scrollTo(0, document.body.scrollHeight);
    }
}
async function generatePDF(params) {
    window.totalPDFs = params.ids.length;
    window.totalDownloadedPDFs = 0;
    const arrayBuffer = await Promise.all(params.ids.map((item, index) => { return getPdf({ ids: [item], location: params.location, total: params.ids.length, current: (index + 1) }) }));
    let PDFDocument = PDFLib.PDFDocument;
    const arrayBufferPDFs = await Promise.all(arrayBuffer.map((item) => { return PDFDocument.load(item) }));
    let mergedFile = await PDFDocument.create();
    let tmp;
    let isCroppingEnabled = false;
    if (document.querySelector('[name=enable-cropping]:checked') && document.querySelector('[name=enable-cropping]:checked').value == "yes") {
        isCroppingEnabled = true;
        var topMargin = parseInt(document.querySelector('#top-margin') ? document.querySelector('#top-margin').value : 20);
        var bottomMargin = parseInt(document.querySelector('#bottom-margin') ? document.querySelector('#bottom-margin').value : 450);
        var leftMargin = parseInt(document.querySelector('#left-margin') ? document.querySelector('#left-margin').value : 175);
        var rightMargin = parseInt(document.querySelector('#right-margin') ? document.querySelector('#right-margin').value : 175);
    }
    document.querySelector('.general-log').innerHTML = document.querySelector('.general-log').innerHTML + "<br> Wait... Downloading Now...";
    arrayBufferPDFs.map(async (item, index) => {
        tmp = await mergedFile.copyPages(item, item.getPageIndices());
        tmp.forEach((page) => {
            if (isCroppingEnabled) {
                page.setCropBox(leftMargin, bottomMargin, page.getWidth() - rightMargin - leftMargin, page.getHeight() - topMargin - bottomMargin);
            }
            mergedFile.addPage(page);
        });
    });

    window.setTimeout(async () => {
        downloadToBrowser(await mergedFile.save({ addDefaultPage: false }), params.name + ".pdf", 'application/pdf');
    }, 2000);

}
function resetLoggers() {
    document.querySelector('.token-log').innerHTML = "";
    document.querySelector('.gathering-shipments-log').innerHTML = "";
    document.querySelector('.pdf-merging-log').innerHTML = "";
    document.querySelector('.pdf-request-log').innerHTML = "";
    document.querySelector('.general-log').innerHTML = "";
}