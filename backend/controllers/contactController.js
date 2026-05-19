import Contact from "../models/Contact.js";
import { getPagination, listResponse } from "../utils/paginate.js";
import { notifyNewEnquiry } from "../utils/mailer.js";

export const createContact = async (req, res) => {
    const { name, email, phone, message } = req.body;
  
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "Name, email, phone, and message are required fields" });
    }
  
    try {
      const newContact = new Contact({
        name,
        email,
        phone,
        message,
      });

      await newContact.save();
      notifyNewEnquiry(newContact); // fire-and-forget admin alert

      res.status(201).json({ message: "Contact created successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  };
  
  export const getAllContacts = async (req, res) => {
    try {
      const pg = getPagination(req);
      let query = Contact.find().sort({ createdAt: -1 });
      if (pg) query = query.skip(pg.skip).limit(pg.limit);
      const contacts = await query;
      const total = pg ? await Contact.countDocuments() : contacts.length;
      res.status(200).json(listResponse(contacts, pg, total));
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to get contacts" });
    }
  };
  
  // Delete a contact / enquiry (admin), SOFT delete (restorable from Trash).
  export const deleteContact = async (req, res) => {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({ success: false, message: "Enquiry not found" });
      }
      await contact.softDelete();
      res.status(200).json({ success: true, message: "Enquiry moved to Trash" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to delete enquiry" });
    }
  };

  export const getSingleContact = async (req, res) => {
    const id = req.params.id;
    try {
      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: "Contact not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Contact retrieved successfully",
        data: contact,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to get the contact" });
    }
  };
  