from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory mock database
USERS = {
    "user@sahl.eg": {
        "name": "Mohamed Shaheen",
        "email": "user@sahl.eg",
        "password": "password123",
        "phone": "+20 100 000 0000",
        "governorate": "Luxor",
    }
}

LISTINGS = [
    {
        "id": 1,
        "title": "iPhone 13 Pro Max - 256GB (Mint Condition)",
        "price": 28500,
        "category": "Electronics",
        "governorate": "Cairo",
        "condition": "Like New",
        "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
        "seller": "Ahmed Ali",
        "date": "2026-10-25",
    },
    {
        "id": 2,
        "title": "Modern L-Shape Sofa Set (4 Pieces)",
        "price": 7500,
        "category": "Furniture",
        "governorate": "Alexandria",
        "condition": "Good",
        "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
        "seller": "Nourhan M.",
        "date": "2026-10-26",
    },
    {
        "id": 3,
        "title": "Canon EOS 80D DSLR Camera with 18-135mm Lens",
        "price": 19000,
        "category": "Electronics",
        "governorate": "Giza",
        "condition": "Very Good",
        "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
        "seller": "Karim Hassan",
        "date": "2026-10-27",
    },
];

STATIONS = [
    {
        "id": "STN-CAI-01",
        "name": "Downtown Cairo Hub - Pharmacie El-Ezaby Partner",
        "governorate": "Cairo",
        "address": "15 Talaat Harb St, Downtown",
        "status": "Active (Capacity: 82%)",
    },
    {
        "id": "STN-ALX-01",
        "name": "Smouha Station - Stationery & Courier Point",
        "governorate": "Alexandria",
        "address": "28 Fawzy Moaz St, Smouha",
        "status": "Active (Capacity: 45%)",
    },
    {
        "id": "STN-LUX-01",
        "name": "Luxor Central Station - Karnak Hub",
        "governorate": "Luxor",
        "address": "Corniche El Nile St, near Temple Gate",
        "status": "Active (Capacity: 30%)",
    },
    {
        "id": "STN-GIZ-01",
        "name": "Dokki Hub - Al-Ahram Partner Store",
        "governorate": "Giza",
        "address": "42 El-Mesaha St, Dokki",
        "status": "Active (Capacity: 60%)",
    },
];

PARCELS = {
    "SAHL-1001": {
        "barcode": "SAHL-1001",
        "item": "iPhone 13 Pro Max - 256GB",
        "status": "In Transit to Buyer Station",
        "origin": "Cairo (Downtown Hub)",
        "destination": "Alexandria (Smouha Station)",
        "estimatedDelivery": "2 Days",
        "history": [
            {"step": "Listing Created & Escrow Funded", "time": "2026-10-26 10:00 AM"},
            {
                "step": "Seller Dropped at Cairo Hub (Inspected & Sealed)",
                "time": "2026-10-26 03:30 PM",
            },
            {
                "step": "Line-haul Transit En Route to Alexandria",
                "time": "2026-10-27 08:00 AM",
            },
        ],
    }
}


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "Sahl Backend API"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = USERS.get(email)
    if user and user["password"] == password:
        return jsonify(
            {
                "success": True,
                "message": "Login successful",
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "phone": user["phone"],
                    "governorate": user["governorate"],
                },
            }
        )
    return jsonify({"success": False, "message": "Invalid email or password"}), 401


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    governorate = data.get("governorate", "Cairo")

    if not email or not password or not name:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    if email in USERS:
        return jsonify({"success": False, "message": "Email already registered"}), 400

    USERS[email] = {
        "name": name,
        "email": email,
        "password": password,
        "phone": data.get("phone", ""),
        "governorate": governorate,
    }
    return jsonify(
        {
            "success": True,
            "message": "Account created successfully",
            "user": {
                "name": name,
                "email": email,
                "phone": USERS[email]["phone"],
                "governorate": governorate,
            },
        }
    )


@app.route("/api/listings", methods=["GET", "POST"])
def handle_listings():
    if request.method == "GET":
        category = request.args.get("category")
        governorate = request.args.get("governorate")
        filtered = LISTINGS
        if category and category != "All":
            filtered = [item for item in filtered if item["category"] == category]
        if governorate and governorate != "All":
            filtered = [
                item for item in filtered if item["governorate"] == governorate
            ]
        return jsonify({"success": True, "listings": filtered})

    elif request.method == "POST":
        data = request.get_json() or {}
        new_listing = {
            "id": len(LISTINGS) + 1,
            "title": data.get("title", "Untitled Item"),
            "price": float(data.get("price", 0)),
            "category": data.get("category", "General"),
            "governorate": data.get("governorate", "Cairo"),
            "condition": data.get("condition", "Good"),
            "image": data.get(
                "image",
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
            ),
            "seller": data.get("seller", "Verified User"),
            "date": "2026-10-30",
        }
        LISTINGS.insert(0, new_listing)
        return jsonify(
            {
                "success": True,
                "message": "Listing published successfully",
                "listing": new_listing,
            }
        )


@app.route("/api/stations", methods=["GET"])
def get_stations():
    gov = request.args.get("governorate")
    if gov and gov != "All":
        filtered = [s for s in STATIONS if s["governorate"] == gov]
        return jsonify({"success": True, "stations": filtered})
    return jsonify({"success": True, "stations": STATIONS})


@app.route("/api/track/<barcode>", methods=["GET"])
def track_parcel(barcode):
    parcel = PARCELS.get(barcode.upper())
    if parcel:
        return jsonify({"success": True, "parcel": parcel})
    # Return a realistic mock response for any searched barcode
    return jsonify(
        {
            "success": True,
            "parcel": {
                "barcode": barcode.upper(),
                "item": "Peer-to-Peer Verified Item",
                "status": "Received at Origin Station & Queued for Line-haul",
                "origin": "Giza Station",
                "destination": "Luxor Central Station",
                "estimatedDelivery": "3 Business Days",
                "history": [
                    {
                        "step": "Listing booked & payment secured in escrow",
                        "time": "2026-10-29 02:15 PM",
                    },
                    {
                        "step": "Item dropped off and inspected at station",
                        "time": "2026-10-30 11:30 AM",
                    },
                ],
            },
        }
    )


@app.route("/api/escrow/calculate", methods=["POST"])
def calculate_escrow():
    data = request.get_json() or {}
    price = float(data.get("price", 1000))
    commission = round(price * 0.05, 2)  # 5% commission
    delivery_fee = 75.0  # Flat 75 EGP standard station-to-station delivery
    total = round(price + commission + delivery_fee, 2)
    return jsonify(
        {
            "success": True,
            "breakdown": {
                "itemPrice": price,
                "commission": commission,
                "deliveryFee": delivery_fee,
                "total": total,
            },
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)