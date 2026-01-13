import Card from "../../components/reusable/Card";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";

const AssetActions = ({ onTransferClick }) => {
  const actions = [
    {
      id: "transfer",
      icon: "cube",
      title: "Transfer Asset",
      description: "Transfer assets between employees or stores",
      buttonText: "Transfer",
      variant: "success",
      onClick: onTransferClick
    },
    {
      id: "history",
      icon: "document",
      title: "View Asset History",
      description: "View assignment and transfer history (Coming Soon)",
      buttonText: "View History",
      variant: "primary",
      onClick: null
    },
  ];

  return (
    <div className="asset-actions">
      {actions.map((action) => (
        <Card key={action.id} className="asset-action-card">
          <div className="action-card-content">
            <div className="action-header">
            <div className={`action-icon ${action.variant}`}>
                <SvgIcon name={action.icon} size={22} />
            </div>

            <h4 className="action-title">{action.title}</h4>
            </div>

            <p className="action-description">{action.description}</p>


            <button
              className={`action-btn action-btn-${action.variant}`}
              onClick={action.onClick || undefined}
              disabled={!action.onClick}
              style={{ opacity: action.onClick ? 1 : 0.6, cursor: action.onClick ? "pointer" : "not-allowed" }}
            >
              {action.buttonText}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AssetActions;
