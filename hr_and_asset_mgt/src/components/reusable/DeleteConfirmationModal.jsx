import CustomModal from "./CustomModal";
import CustomButton from "./Button";

export default function DeleteConfirmationModal({ show, onClose, onConfirm, itemName, loading }) {
    return (
        <CustomModal
            show={show}
            title="Confirm Deletion"
            onClose={onClose}
            footer={
                <>
                    <CustomButton
                        variant="secondary"
                        onClick={onClose}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                        disabled={loading}
                    >
                        Cancel
                    </CustomButton>
                    <CustomButton
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </CustomButton>
                </>
            }
        >
            <div className="flex flex-col gap-3">
                <p className="text-gray-600">
                    Are you sure you want to delete <strong>{itemName}</strong>?
                </p>
                <p className="text-sm text-red-500">
                    This action cannot be undone.
                </p>
            </div>
        </CustomModal>
    );
}
